// Content script for LaTeX Formula Colorizer

// Store for formula data
const formulaStore = {
  formulas: new Map(),
  variables: new Set(),
  sections: new Map(),
  selectedVariables: new Set(),
  variableColors: new Map(), // Store colors for each variable
};

// Performance optimization: Add cache system
const performanceCache = {
  formulaCache: new Map(), // Cache for parsed formulas
  colorCache: new Map(), // Cache for computed colors
  domCache: new WeakMap(), // Cache for DOM elements
  sectionCache: new Map(), // Cache for section data
  renderQueue: new Set(), // Queue for pending renders
  isRendering: false, // Render lock
  lastRender: 0, // Timestamp of last render
  RENDER_THROTTLE: 16, // ~60fps throttle
  BATCH_SIZE: 10, // Number of formulas to process in one batch
};

// Initialize when DOM is ready
function init() {
  console.log("Initializing LaTeX Formula Colorizer...");

  // Performance: Use IntersectionObserver for lazy loading
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          if (!performanceCache.formulaCache.has(element)) {
            processFormula(element);
          }
          observer.unobserve(element);
        }
      });
    },
    {
      rootMargin: "50px",
      threshold: 0.1,
    }
  );

  // Find all math elements
  const mathElements = document.querySelectorAll(".mwe-math-element");
  console.log(`Found ${mathElements.length} math elements`);

  if (mathElements.length === 0) {
    console.log("No math elements found on page");
    return;
  }

  // Performance: Batch process formulas
  Array.from(mathElements).forEach((element, index) => {
    observer.observe(element);
    if (index < 10) {
      // Immediately process first 10 formulas
      processFormula(element);
    }
  });

  setupControls();
  initializeEventHandlers();

  // Start render loop
  requestAnimationFrame(renderLoop);

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    switch (message.type) {
      case "settingsChanged":
        handleSettingsChange(message.settings);
        sendResponse({ success: true });
        break;
      case "getState":
        sendResponse({
          formulas: Array.from(formulaStore.formulas.values()),
          variables: Array.from(formulaStore.variables),
          sections: Array.from(formulaStore.sections.values()),
          selectedVariables: Array.from(formulaStore.selectedVariables),
        });
        break;
    }
    return true;
  });
}

// Performance: Batch process formulas
function processFormula(element) {
  try {
    const id =
      element.getAttribute("data-formula-id") ||
      `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    element.setAttribute("data-formula-id", id);

    // Check cache first
    if (performanceCache.formulaCache.has(id)) {
      return performanceCache.formulaCache.get(id);
    }

    // Get LaTeX content
    const latex = extractLatex(element);
    if (!latex) return null;

    // Process formula data
    const formula = {
      id,
      latex,
      element,
      variables: parseVariables(latex),
      section: findSection(element),
      timestamp: Date.now(),
    };

    // Cache the result
    performanceCache.formulaCache.set(id, formula);
    performanceCache.domCache.set(element, {
      handlers: new Map(),
      state: new Map(),
    });

    // Add to formula store
    formulaStore.formulas.set(id, formula);
    formula.variables.forEach((v) => formulaStore.variables.add(v));

    // Setup event handlers
    setupFormulaHandlers(formula);

    return formula;
  } catch (error) {
    console.error("Error processing formula:", error);
    return null;
  }
}

// Performance: Extract LaTeX with caching
function extractLatex(element) {
  const cacheKey = element.innerHTML;
  if (performanceCache.colorCache.has(cacheKey)) {
    return performanceCache.colorCache.get(cacheKey);
  }

  const mathML = element.querySelector(".mwe-math-mathml-a11y");
  const fallbackImg = element.querySelector(".mwe-math-fallback-image-inline");

  let latex = "";
  if (mathML) {
    const annotation = mathML.querySelector(
      'annotation[encoding="application/x-tex"]'
    );
    latex = annotation ? annotation.textContent : "";
  } else if (fallbackImg) {
    latex = fallbackImg.getAttribute("alt");
  }

  performanceCache.colorCache.set(cacheKey, latex);
  return latex;
}

// Performance: Optimize event handlers
function setupFormulaHandlers(formula) {
  const domCache = performanceCache.domCache.get(formula.element);
  if (!domCache) return;

  // Remove existing handlers
  if (domCache.handlers.size > 0) {
    domCache.handlers.forEach((handler, type) => {
      formula.element.removeEventListener(type, handler);
    });
    domCache.handlers.clear();
  }

  // Add optimized handlers
  const clickHandler = debounce((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFormulaClick(formula);
  }, 100);

  const enterHandler = debounce(() => {
    if (!performanceCache.isRendering) {
      showTooltip(formula);
    }
  }, 50);

  const leaveHandler = debounce(() => {
    hideTooltip();
  }, 50);

  formula.element.addEventListener("click", clickHandler);
  formula.element.addEventListener("mouseenter", enterHandler);
  formula.element.addEventListener("mouseleave", leaveHandler);

  domCache.handlers.set("click", clickHandler);
  domCache.handlers.set("mouseenter", enterHandler);
  domCache.handlers.set("mouseleave", leaveHandler);

  // Add visual indicator
  formula.element.style.cursor = "pointer";
  formula.element.classList.add("formula-interactive");
}

// Performance: Implement render loop
function renderLoop(timestamp) {
  if (
    !performanceCache.isRendering &&
    performanceCache.renderQueue.size > 0 &&
    timestamp - performanceCache.lastRender >= performanceCache.RENDER_THROTTLE
  ) {
    performanceCache.isRendering = true;
    const batch = Array.from(performanceCache.renderQueue).slice(
      0,
      performanceCache.BATCH_SIZE
    );

    batch.forEach((id) => {
      const formula = formulaStore.formulas.get(id);
      if (formula) {
        updateFormulaDisplay(formula);
      }
      performanceCache.renderQueue.delete(id);
    });

    performanceCache.lastRender = timestamp;
    performanceCache.isRendering = false;
  }

  requestAnimationFrame(renderLoop);
}

// Performance: Optimize formula display updates
function updateFormulaDisplay(formula) {
  const domCache = performanceCache.domCache.get(formula.element);
  if (!domCache) return;

  const currentState = JSON.stringify({
    selected: Array.from(formulaStore.selectedVariables),
    colors: Array.from(formulaStore.variableColors),
  });

  if (domCache.state.get("displayState") === currentState) {
    return; // No changes, skip update
  }

  const hasSelected = formula.variables.some((v) =>
    formulaStore.selectedVariables.has(v)
  );

  if (hasSelected) {
    formula.element.classList.add("formula-highlight");
    const color = getVariableColor(
      formula.variables.find((v) => formulaStore.selectedVariables.has(v))
    );
    formula.element.style.setProperty("--highlight-color", color);
  } else {
    formula.element.classList.remove("formula-highlight");
    formula.element.style.removeProperty("--highlight-color");
  }

  domCache.state.set("displayState", currentState);
}

// Performance: Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Performance: Optimize highlight updates
function highlightVariables() {
  console.log(
    "Highlighting variables:",
    Array.from(formulaStore.selectedVariables)
  );

  // Add formulas to render queue instead of updating immediately
  formulaStore.formulas.forEach((formula) => {
    performanceCache.renderQueue.add(formula.id);
  });
}

// Memory management: Cleanup unused cache
function cleanupCache() {
  const now = Date.now();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  performanceCache.formulaCache.forEach((formula, id) => {
    if (now - formula.timestamp > CACHE_TTL) {
      performanceCache.formulaCache.delete(id);
    }
  });

  // Cleanup color cache
  if (performanceCache.colorCache.size > 1000) {
    const oldestEntries = Array.from(
      performanceCache.colorCache.entries()
    ).slice(0, performanceCache.colorCache.size - 1000);
    oldestEntries.forEach(([key]) => performanceCache.colorCache.delete(key));
  }
}

// Run cache cleanup periodically
setInterval(cleanupCache, 60000); // Every minute

// Find containing section for a formula
function findSection(element) {
  console.log("Finding section for element:", element);
  const headings = ["H1", "H2", "H3", "H4", "H5", "H6"];
  let current = element;

  while (current && current.parentElement) {
    const previousSibling = current.previousElementSibling;
    if (previousSibling && headings.includes(previousSibling.tagName)) {
      const section = {
        id: previousSibling.id || `section-${Date.now()}`,
        level: parseInt(previousSibling.tagName[1]),
        title: previousSibling.textContent.trim(),
        element: previousSibling,
      };
      console.log("Found section:", section);
      return section;
    }
    current = current.parentElement;
  }
  console.log("No section found for element");
  return null;
}

// Handle settings changes
function handleSettingsChange(settings) {
  console.log("Settings changed:", settings);

  if (settings.action === "clearHighlights") {
    console.log("Clearing all highlights");
    formulaStore.selectedVariables.clear();
    highlightVariables();
  } else if (settings.action === "applyHighlights") {
    console.log("Applying highlights to all formulas");
    highlightVariables();
  }
}

// Parse variables from LaTeX
function parseVariables(latex) {
  console.log("Parsing variables from:", latex);
  const variables = new Set();

  // Remove display style and other formatting commands
  latex = latex
    .replace(/\\displaystyle/g, "")
    .replace(/\\text\{[^}]+\}/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "")
    .replace(/\{|\}/g, " ")
    .trim();

  // Variable patterns
  const patterns = [
    // Single letters (excluding numbers and common operators)
    /(?<!\\)[a-zA-Z](?![\d\s=+\-*/\\])/g,

    // Greek letters
    /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?![a-zA-Z])/gi,

    // Subscripted variables
    /([a-zA-Z])_([a-zA-Z0-9]+)/g,

    // Vector/matrix variables
    /\\(?:vec|mathbf)\{([a-zA-Z])\}/g,
  ];

  patterns.forEach((pattern) => {
    const matches = latex.matchAll(pattern);
    for (const match of matches) {
      const variable = cleanVariable(match[0]);
      if (variable && !isLatexCommand(variable)) {
        console.log("Found variable:", variable);
        variables.add(variable);
      }
    }
  });

  const result = Array.from(variables);
  console.log("Parsed variables:", result);
  return result;
}

// Clean variable name
function cleanVariable(variable) {
  return variable
    .replace(/^\\/, "")
    .replace(/\{|\}/g, "")
    .replace(/^(mathbf|vec)/, "")
    .trim();
}

// Check for LaTeX commands
function isLatexCommand(str) {
  const commands = [
    "sum",
    "int",
    "frac",
    "sqrt",
    "text",
    "mathbf",
    "mathrm",
    "left",
    "right",
    "begin",
    "end",
    "cdot",
    "times",
  ];
  return commands.includes(str.toLowerCase());
}

// Get or generate color for variable
function getVariableColor(variable) {
  // Check if we already have a color for this variable
  if (formulaStore.variableColors.has(variable)) {
    return formulaStore.variableColors.get(variable);
  }

  // Generate a new color
  let hue;
  switch (variable) {
    case "x":
      hue = 200; // Blue
      break;
    case "y":
      hue = 120; // Green
      break;
    case "z":
      hue = 280; // Purple
      break;
    case "alpha":
    case "β":
    case "beta":
      hue = 30; // Orange
      break;
    case "theta":
    case "φ":
    case "phi":
      hue = 340; // Red
      break;
    default:
      // Generate a random hue that's not too close to existing ones
      hue = Math.floor(Math.random() * 360);
      const existingHues = Array.from(formulaStore.variableColors.values()).map(
        (color) => parseInt(color.match(/hsl\((\d+)/)[1])
      );
      while (existingHues.some((h) => Math.abs(h - hue) < 30)) {
        hue = (hue + 47) % 360; // Golden ratio to spread colors nicely
      }
  }

  const color = `hsl(${hue}, 70%, 45%)`;
  formulaStore.variableColors.set(variable, color);
  return color;
}

// Handle formula click
function handleFormulaClick(formula) {
  console.log("Handling formula click:", formula);

  // Remove any existing containers
  const existingContainer = document.querySelector(".math-variable-container");
  if (existingContainer) {
    existingContainer.remove();
  }

  const variableList = document.createElement("div");
  variableList.className = "math-variable-list";

  // Add header with close button
  const header = document.createElement("div");
  header.className = "variable-container-header";
  header.innerHTML = `
    <h3>Formula Variables</h3>
    <button class="close-button">×</button>
  `;

  // Add close button handler
  header.querySelector(".close-button").addEventListener("click", () => {
    document.querySelector(".math-variable-container").remove();
  });

  formula.variables.forEach((variable) => {
    const color = getVariableColor(variable);
    const variableEl = document.createElement("div");
    variableEl.className = "math-variable-item";
    variableEl.innerHTML = `
      <label>
        <input type="checkbox" value="${variable}" 
          ${formulaStore.selectedVariables.has(variable) ? "checked" : ""}>
        <span class="variable-name">${variable}</span>
        <div class="variable-color-controls">
          <span class="variable-color" style="background-color: ${color}"></span>
          <div class="color-picker-container">
            <input type="color" class="color-picker" value="${rgbToHex(color)}" 
              data-variable="${variable}">
            <div class="color-controls">
              <input type="range" class="hue-slider" min="0" max="360" value="180">
              <input type="range" class="saturation-slider" min="0" max="100" value="70">
              <input type="range" class="lightness-slider" min="0" max="100" value="45">
              <input type="range" class="opacity-slider" min="0" max="100" value="100">
            </div>
          </div>
        </div>
      </label>
    `;

    // Add event listeners
    const checkbox = variableEl.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", (e) => {
      console.log(
        `Variable ${variable} ${e.target.checked ? "selected" : "deselected"}`
      );
      if (e.target.checked) {
        formulaStore.selectedVariables.add(variable);
      } else {
        formulaStore.selectedVariables.delete(variable);
      }
      highlightVariables();
    });

    const colorPicker = variableEl.querySelector(".color-picker");
    const colorControls = variableEl.querySelector(".color-controls");
    let isColorPickerOpen = false;

    // Show/hide color controls on color picker click
    variableEl
      .querySelector(".variable-color")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        isColorPickerOpen = !isColorPickerOpen;
        colorControls.style.display = isColorPickerOpen ? "block" : "none";
      });

    // Update color when sliders change
    const updateColorFromSliders = () => {
      const hue = variableEl.querySelector(".hue-slider").value;
      const saturation = variableEl.querySelector(".saturation-slider").value;
      const lightness = variableEl.querySelector(".lightness-slider").value;
      const opacity = variableEl.querySelector(".opacity-slider").value;

      const newColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${
        opacity / 100
      })`;
      formulaStore.variableColors.set(variable, newColor);
      variableEl.querySelector(".variable-color").style.backgroundColor =
        newColor;
      highlightVariables();
    };

    variableEl.querySelectorAll("input[type='range']").forEach((slider) => {
      slider.addEventListener("input", updateColorFromSliders);
    });

    // Close color picker when clicking outside
    document.addEventListener("click", (e) => {
      if (!variableEl.contains(e.target)) {
        isColorPickerOpen = false;
        colorControls.style.display = "none";
      }
    });

    variableList.appendChild(variableEl);
  });

  const container = document.createElement("div");
  container.className = "math-variable-container";
  container.appendChild(header);
  container.appendChild(variableList);

  document.body.appendChild(container);
  positionElement(container, formula.element);
}

// Show formula tooltip
function showTooltip(formula) {
  // Remove any existing tooltips
  hideTooltip();

  const tooltip = document.createElement("div");
  tooltip.className = "math-tooltip";
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <div class="tooltip-latex">${formula.latex}</div>
      <div class="tooltip-variables">
        Variables: ${formula.variables.join(", ")}
      </div>
      ${
        formula.section
          ? `
        <div class="tooltip-section">
          Section: ${formula.section.title}
        </div>
      `
          : ""
      }
    </div>
  `;

  document.body.appendChild(tooltip);
  positionElement(tooltip, formula.element);
}

// Hide tooltip
function hideTooltip() {
  const tooltips = document.querySelectorAll(".math-tooltip");
  tooltips.forEach((tooltip) => tooltip.remove());
}

// Position element relative to target
function positionElement(element, target) {
  const rect = target.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  element.style.position = "absolute";
  element.style.top = `${rect.bottom + scrollTop}px`;
  element.style.left = `${rect.left + scrollLeft}px`;

  // Adjust if off screen
  const bounds = element.getBoundingClientRect();
  if (bounds.right > window.innerWidth) {
    element.style.left = `${
      window.innerWidth - bounds.width - 10 + scrollLeft
    }px`;
  }
  if (bounds.bottom > window.innerHeight) {
    element.style.top = `${rect.top + scrollTop - bounds.height}px`;
  }
}

// Convert RGB to Hex
function rgbToHex(color) {
  // Handle HSL color
  if (color.startsWith("hsl")) {
    const temp = document.createElement("div");
    temp.style.color = color;
    document.body.appendChild(temp);
    const rgbColor = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const [r, g, b] = rgbColor.match(/\d+/g).map(Number);
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }
  return color;
}

// Convert Hex to HSL
function hexToHSL(hex) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)}, 70%, 45%)`;
}

// Setup controls panel
function setupControls() {
  console.log("Setting up global controls");

  // Remove existing controls if any
  const existingControls = document.querySelector(".math-global-controls");
  if (existingControls) {
    existingControls.remove();
  }

  const controls = document.createElement("div");
  controls.className = "math-global-controls";
  controls.innerHTML = `
    <div class="controls-header">
      <h3>Formula Controls</h3>
      <button class="minimize-controls">−</button>
    </div>
    <div class="controls-content">
      <div class="variable-filters"></div>
      <div class="section-filters"></div>
      <div class="control-buttons">
        <button class="clear-all-highlights">Clear All</button>
      </div>
    </div>
  `;

  document.body.appendChild(controls);

  // Add event listeners
  controls
    .querySelector(".minimize-controls")
    .addEventListener("click", (e) => {
      const content = controls.querySelector(".controls-content");
      content.style.display =
        content.style.display === "none" ? "block" : "none";
      e.target.textContent = content.style.display === "none" ? "+" : "−";
    });

  controls
    .querySelector(".clear-all-highlights")
    .addEventListener("click", () => {
      console.log("Clearing all highlights globally");
      formulaStore.selectedVariables.clear();
      highlightVariables();
    });
}

// Initialize event handlers
function initializeEventHandlers() {
  console.log("Initializing event handlers...");

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      console.log("Received message:", message);

      switch (message.type) {
        case "settingsChanged":
          handleSettingsChange(message.settings);
          sendResponse({ success: true });
          break;
        case "getState":
          const state = {
            formulas: Array.from(formulaStore.formulas.values()),
            variables: Array.from(formulaStore.variables),
            sections: Array.from(formulaStore.sections.values()),
            selectedVariables: Array.from(formulaStore.selectedVariables),
            performance: PerformanceMonitor.getReport(),
          };
          sendResponse({ success: true, state });
          break;
        case "clearHighlights":
          formulaStore.selectedVariables.clear();
          highlightVariables();
          sendResponse({ success: true });
          break;
        case "resetSettings":
          resetToDefaultSettings();
          sendResponse({ success: true });
          break;
        default:
          console.warn("Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep the message channel open for async response
  });

  // Initialize performance monitoring
  if (window.PerformanceMonitor) {
    PerformanceMonitor.init();
    setInterval(() => {
      PerformanceMonitor.logReport();
    }, 5000); // Log every 5 seconds
  }
}

// Reset settings to default
function resetToDefaultSettings() {
  console.log("Resetting to default settings...");

  formulaStore.selectedVariables.clear();
  formulaStore.variableColors.clear();

  const defaultSettings = {
    autoHighlight: true,
    showTooltips: true,
    darkMode: false,
    performanceMode: false,
  };

  chrome.storage.sync.set(defaultSettings, () => {
    console.log("Settings reset to defaults");
    highlightVariables();
  });
}

// Handle settings changes
function handleSettingsChange(settings) {
  console.log("Settings changed:", settings);

  if (settings.hasOwnProperty("autoHighlight")) {
    if (!settings.autoHighlight) {
      formulaStore.selectedVariables.clear();
      highlightVariables();
    }
  }

  if (settings.hasOwnProperty("performanceMode")) {
    performanceCache.RENDER_THROTTLE = settings.performanceMode ? 32 : 16; // 30fps vs 60fps
    performanceCache.BATCH_SIZE = settings.performanceMode ? 5 : 10;
  }

  if (settings.action === "clearHighlights") {
    console.log("Clearing all highlights");
    formulaStore.selectedVariables.clear();
    highlightVariables();
  } else if (settings.action === "applyHighlights") {
    console.log("Applying highlights to all formulas");
    highlightVariables();
  }
}

// Start extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
