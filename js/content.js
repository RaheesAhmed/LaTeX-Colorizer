// Core utilities
const utils = {
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Clean variable name
  cleanVariable(variable) {
    try {
      return variable
        .replace(/^\\/, "")
        .replace(/\{|\}/g, "")
        .replace(/^(mathbf|vec)/, "")
        .trim();
    } catch (error) {
      console.error("Error cleaning variable:", error);
      return "";
    }
  },

  // Check for LaTeX commands
  isLatexCommand(str) {
    const commands = new Set([
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
    ]);
    return commands.has(str.toLowerCase());
  },

  // Extract LaTeX from element
  extractLatex(element) {
    const cacheKey = element.innerHTML;
    if (performanceCache.colorCache.has(cacheKey)) {
      return performanceCache.colorCache.get(cacheKey);
    }

    let latex = "";
    try {
      const mathML = element.querySelector(".mwe-math-mathml-a11y");
      if (mathML) {
        const annotation = mathML.querySelector(
          'annotation[encoding="application/x-tex"]'
        );
        latex = annotation ? annotation.textContent : "";
      } else {
        const fallbackImg = element.querySelector(
          ".mwe-math-fallback-image-inline"
        );
        latex = fallbackImg ? fallbackImg.getAttribute("alt") : "";
      }

      if (latex) {
        performanceCache.colorCache.set(cacheKey, latex);
      }
    } catch (error) {
      console.error("Error extracting LaTeX:", error);
    }

    return latex;
  },

  // Parse variables from LaTeX
  parseVariables(latex) {
    const cacheKey = `vars_${latex}`;
    if (performanceCache.colorCache.has(cacheKey)) {
      return performanceCache.colorCache.get(cacheKey);
    }

    console.log("Parsing variables from:", latex);
    const variables = new Set();

    try {
      const cleanLatex = latex
        .replace(/\\displaystyle/g, "")
        .replace(/\\text\{[^}]+\}/g, "")
        .replace(/\\left|\\right/g, "")
        .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "")
        .replace(/\\[a-zA-Z]+(?![a-zA-Z])/g, " ")
        .replace(/\{|\}/g, " ")
        .trim();

      const commonVars = new Set([
        "x",
        "y",
        "z",
        "n",
        "i",
        "j",
        "k",
        "a",
        "b",
        "c",
        "α",
        "β",
        "γ",
        "θ",
        "φ",
      ]);

      const patterns = [
        /(?<!\\)[a-zA-Z](?![\d\s=+\-*/\\])/g,
        /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?![a-zA-Z])/gi,
        /([a-zA-Z])_([a-zA-Z0-9]+)/g,
        /\\(?:vec|mathbf)\{([a-zA-Z])\}/g,
      ];

      patterns.forEach((pattern) => {
        const matches = cleanLatex.matchAll(pattern);
        for (const match of matches) {
          const variable = this.cleanVariable(match[0]);
          if (variable && !this.isLatexCommand(variable)) {
            if (commonVars.has(variable)) {
              variables.add(variable);
            } else if (variable.length === 1 || variable.includes("_")) {
              variables.add(variable);
            }
          }
        }
      });

      const result = Array.from(variables);
      performanceCache.colorCache.set(cacheKey, result);
      console.log("Parsed variables:", result);
      return result;
    } catch (error) {
      console.error("Error parsing variables:", error);
      return [];
    }
  },
};

// Tooltip management
const tooltipManager = {
  activeTooltip: null,

  show(formula) {
    this.hide();
    const tooltip = document.createElement("div");
    tooltip.className = "math-tooltip";
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <div class="tooltip-latex">${formula.latex}</div>
        <div class="tooltip-variables">
          Variables: ${formula.variables.join(", ")}
        </div>
      </div>
    `;

    document.body.appendChild(tooltip);
    this.positionTooltip(tooltip, formula.element);
    this.activeTooltip = tooltip;
  },

  hide() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
  },

  positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    tooltip.style.position = "absolute";
    tooltip.style.top = `${rect.bottom + scrollTop}px`;
    tooltip.style.left = `${rect.left + scrollLeft}px`;

    const bounds = tooltip.getBoundingClientRect();
    if (bounds.right > window.innerWidth) {
      tooltip.style.left = `${
        window.innerWidth - bounds.width - 10 + scrollLeft
      }px`;
    }
    if (bounds.bottom > window.innerHeight) {
      tooltip.style.top = `${rect.top + scrollTop - bounds.height}px`;
    }
  },
};

// Store for formula data
const formulaStore = {
  formulas: new Map(),
  variables: new Set(),
  sections: new Map(),
  selectedVariables: new Set(),
  variableColors: new Map(),
};

// Performance cache
const performanceCache = {
  formulaCache: new Map(),
  colorCache: new Map(),
  domCache: new WeakMap(),
  renderQueue: new Set(),
  isRendering: false,
  lastRender: 0,
  RENDER_THROTTLE: 16,
  BATCH_SIZE: 5,
};

// Initialize when DOM is ready
function init() {
  if (isInitialized) return;

  initTimeout = setTimeout(() => {
    console.log("Initializing LaTeX Formula Colorizer...");
    const mathElements = document.querySelectorAll(
      ".mwe-math-element:not([data-formula-processed])"
    );

    if (mathElements.length === 0) {
      console.log("No math elements found on page");
      return;
    }

    console.log(`Found ${mathElements.length} math elements`);

    // Process first few formulas immediately
    const immediate = Array.from(mathElements).slice(0, 3);
    immediate.forEach((element) => {
      element.setAttribute("data-formula-processed", "true");
      processFormula(element);
    });

    // Setup observers for remaining formulas
    setupObservers(mathElements);
    setupEventHandlers();

    isInitialized = true;
  }, 1000);
}

// Setup observers for lazy loading
function setupObservers(initialElements) {
  // Intersection Observer for lazy loading
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          if (!element.hasAttribute("data-formula-processed")) {
            element.setAttribute("data-formula-processed", "true");
            requestIdleCallback(() => processFormula(element), {
              timeout: 1000,
            });
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

  // Observe remaining elements
  Array.from(initialElements)
    .slice(3)
    .forEach((element) => {
      observer.observe(element);
    });

  // Mutation Observer for dynamic content
  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const mathElements = mutation.target.querySelectorAll(
          ".mwe-math-element:not([data-formula-processed])"
        );
        mathElements.forEach((element) => observer.observe(element));
      }
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Setup event handlers
function setupEventHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      console.log("Received message:", message);

      switch (message.type) {
        case "settingsChanged":
          handleSettingsChange(message.settings);
          sendResponse({ success: true });
          break;
        case "getState":
          sendResponse({
            success: true,
            state: {
              formulas: Array.from(formulaStore.formulas.values()),
              variables: Array.from(formulaStore.variables),
              sections: Array.from(formulaStore.sections.values()),
              selectedVariables: Array.from(formulaStore.selectedVariables),
              performance: window.PerformanceMonitor?.getReport(),
            },
          });
          break;
        default:
          console.warn("Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  });
}

// Process formula
function processFormula(element) {
  try {
    const startTime = performance.now();
    const id =
      element.getAttribute("data-formula-id") ||
      `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    element.setAttribute("data-formula-id", id);

    // Check cache first
    if (performanceCache.formulaCache.has(id)) {
      return performanceCache.formulaCache.get(id);
    }

    // Get LaTeX content efficiently
    const latex = utils.extractLatex(element);
    if (!latex) return null;

    // Create formula object
    const formula = {
      id,
      latex,
      element,
      variables: utils.parseVariables(latex),
      timestamp: Date.now(),
    };

    // Cache results
    performanceCache.formulaCache.set(id, formula);
    performanceCache.domCache.set(element, {
      handlers: new Map(),
      state: new Map(),
    });

    // Store formula data
    formulaStore.formulas.set(id, formula);
    formula.variables.forEach((v) => formulaStore.variables.add(v));

    // Add minimal event handlers
    setupFormulaHandlers(formula);

    // Track performance
    if (window.PerformanceMonitor) {
      PerformanceMonitor.trackOperation("formulaProcessed");
      PerformanceMonitor.trackRender(startTime);
    }

    return formula;
  } catch (error) {
    console.error("Error processing formula:", error);
    return null;
  }
}

// Setup formula handlers
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
  const clickHandler = utils.debounce((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFormulaClick(formula);
  }, 100);

  const enterHandler = utils.debounce(() => {
    if (!performanceCache.isRendering) {
      tooltipManager.show(formula);
    }
  }, 50);

  const leaveHandler = utils.debounce(() => {
    tooltipManager.hide();
  }, 50);

  formula.element.addEventListener("click", clickHandler);
  formula.element.addEventListener("mouseenter", enterHandler);
  formula.element.addEventListener("mouseleave", leaveHandler);

  domCache.handlers.set("click", clickHandler);
  domCache.handlers.set("mouseenter", enterHandler);
  domCache.handlers.set("mouseleave", leaveHandler);

  formula.element.style.cursor = "pointer";
  formula.element.classList.add("formula-interactive");
}

// Handle formula click
function handleFormulaClick(formula) {
  console.log("Formula clicked:", formula);
  // Implement click handling logic here
}

// Handle settings changes
function handleSettingsChange(settings) {
  console.log("Settings changed:", settings);
  // Implement settings change logic here
}

let isInitialized = false;
let initTimeout = null;

// Start extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Cleanup on unload
window.addEventListener("unload", () => {
  if (initTimeout) {
    clearTimeout(initTimeout);
  }
  performanceCache.formulaCache.clear();
  performanceCache.colorCache.clear();
  formulaStore.formulas.clear();
  formulaStore.variables.clear();
});
