// Content script for LaTeX Formula Colorizer

// Store for formula data
const formulaStore = {
  formulas: new Map(),
  variables: new Set(),
  sections: new Map(),
  selectedVariables: new Set(),
  variableColors: new Map(), // Store colors for each variable
};

// Initialize when DOM is ready
function init() {
  console.log("Initializing LaTeX Formula Colorizer...");

  const mathElements = document.querySelectorAll(".mwe-math-element");
  console.log(`Found ${mathElements.length} math elements`);

  if (mathElements.length === 0) {
    console.log("No math elements found on page");
    return;
  }

  detectFormulas();
  setupControls();

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

// Detect and process formulas
function detectFormulas() {
  console.log("Detecting formulas...");
  const mathElements = document.querySelectorAll(".mwe-math-element");

  mathElements.forEach((element, index) => {
    try {
      // Get LaTeX content
      const mathML = element.querySelector(".mwe-math-mathml-a11y");
      const fallbackImg = element.querySelector(
        ".mwe-math-fallback-image-inline"
      );

      let latex = "";
      if (mathML) {
        const annotation = mathML.querySelector(
          'annotation[encoding="application/x-tex"]'
        );
        latex = annotation ? annotation.textContent : "";
      } else if (fallbackImg) {
        latex = fallbackImg.getAttribute("alt");
      }

      if (latex) {
        console.log(`Processing formula ${index}:`, latex);

        const id = `formula-${index}`;
        element.setAttribute("data-formula-id", id);

        // Process formula
        const variables = parseVariables(latex);
        console.log(`Found variables:`, variables);

        const formula = {
          id,
          latex,
          element,
          variables,
          section: findSection(element),
        };

        // Store formula data
        formulaStore.formulas.set(id, formula);
        variables.forEach((v) => formulaStore.variables.add(v));

        // Remove existing listeners to prevent duplicates
        element.removeEventListener("click", handleFormulaClick);
        element.removeEventListener("mouseenter", showTooltip);
        element.removeEventListener("mouseleave", hideTooltip);

        // Add click handler
        element.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Formula clicked:", id);
          handleFormulaClick(formula);
        });

        // Add hover handler
        element.addEventListener("mouseenter", () => {
          console.log("Formula hover:", id);
          showTooltip(formula);
        });

        element.addEventListener("mouseleave", () => {
          console.log("Formula unhover:", id);
          hideTooltip();
        });

        // Add visual indicator that element is interactive
        element.style.cursor = "pointer";
        element.classList.add("formula-interactive");
      }
    } catch (error) {
      console.error("Error processing formula:", error);
    }
  });

  console.log("Formula detection complete");
  console.log("Total formulas:", formulaStore.formulas.size);
  console.log("Total variables:", formulaStore.variables.size);
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
          <input type="color" class="color-picker" value="${rgbToHex(color)}" 
            data-variable="${variable}">
        </div>
      </label>
    `;

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
    colorPicker.addEventListener("change", (e) => {
      const newColor = e.target.value;
      const hslColor = hexToHSL(newColor);
      formulaStore.variableColors.set(variable, hslColor);
      variableEl.querySelector(".variable-color").style.backgroundColor =
        hslColor;
      highlightVariables();
    });

    variableList.appendChild(variableEl);
  });

  const controls = document.createElement("div");
  controls.className = "math-controls";
  controls.innerHTML = `
    <button class="select-all">Select All</button>
    <button class="clear-all">Clear All</button>
  `;

  controls.querySelector(".select-all").addEventListener("click", () => {
    console.log("Selecting all variables");
    formula.variables.forEach((v) => formulaStore.selectedVariables.add(v));
    variableList
      .querySelectorAll("input")
      .forEach((input) => (input.checked = true));
    highlightVariables();
  });

  controls.querySelector(".clear-all").addEventListener("click", () => {
    console.log("Clearing all variables");
    formulaStore.selectedVariables.clear();
    variableList
      .querySelectorAll("input")
      .forEach((input) => (input.checked = false));
    highlightVariables();
  });

  const container = document.createElement("div");
  container.className = "math-variable-container";
  container.appendChild(variableList);
  container.appendChild(controls);

  document.body.appendChild(container);
  positionElement(container, formula.element);

  // Close container when clicking outside
  document.addEventListener(
    "click",
    (e) => {
      if (
        !container.contains(e.target) &&
        !formula.element.contains(e.target)
      ) {
        container.remove();
      }
    },
    { once: true }
  );
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

// Highlight selected variables
function highlightVariables() {
  console.log(
    "Highlighting variables:",
    Array.from(formulaStore.selectedVariables)
  );

  // Clear all highlights
  document.querySelectorAll(".formula-highlight").forEach((el) => {
    el.classList.remove("formula-highlight");
    el.style.removeProperty("--highlight-color");
  });

  // Add highlights for selected variables
  if (formulaStore.selectedVariables.size > 0) {
    formulaStore.formulas.forEach((formula) => {
      const selectedVarsInFormula = formula.variables.filter((v) =>
        formulaStore.selectedVariables.has(v)
      );

      if (selectedVarsInFormula.length > 0) {
        formula.element.classList.add("formula-highlight");
        // Use the color of the first selected variable
        const color = getVariableColor(selectedVarsInFormula[0]);
        formula.element.style.setProperty("--highlight-color", color);
      }
    });
  }
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

// Start extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
