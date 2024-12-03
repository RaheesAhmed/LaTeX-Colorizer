// Utility functions
const utils = {
  // Debounce: Delay execution until after wait time
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

  // Throttle: Limit execution rate
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
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

  // Parse variables from LaTeX
  parseVariables(latex) {
    // Check cache first
    const cacheKey = `vars_${latex}`;
    if (performanceCache.colorCache.has(cacheKey)) {
      return performanceCache.colorCache.get(cacheKey);
    }

    console.log("Parsing variables from:", latex);
    const variables = new Set();

    try {
      // Clean LaTeX before parsing
      const cleanLatex = latex
        .replace(/\\displaystyle/g, "")
        .replace(/\\text\{[^}]+\}/g, "")
        .replace(/\\left|\\right/g, "")
        .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "")
        .replace(/\\[a-zA-Z]+(?![a-zA-Z])/g, " ")
        .replace(/\{|\}/g, " ")
        .trim();

      // Common mathematical variables
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

      // Variable patterns
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

// Store for formula data
const formulaStore = {
  formulas: new Map(),
  variables: new Set(),
  sections: new Map(),
  selectedVariables: new Set(),
  variableColors: new Map(),
};

// Performance optimization: Add cache system
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

let isInitialized = false;
let initTimeout = null;

// Initialize when DOM is ready
function init() {
  if (isInitialized) return;

  // Delay initialization to not block page load
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

// Process formula with performance optimization
function processFormula(element) {
  try {
    const startTime = performance.now();
    const id =
      element.getAttribute("data-formula-id") ||
      `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check cache first
    if (performanceCache.formulaCache.has(id)) {
      return performanceCache.formulaCache.get(id);
    }

    // Get LaTeX content efficiently
    const latex = extractLatex(element);
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

// Setup formula handlers with utils.debounce
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

  // Add optimized handlers using utils.debounce
  const clickHandler = utils.debounce((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFormulaClick(formula);
  }, 100);

  const enterHandler = utils.debounce(() => {
    if (!performanceCache.isRendering) {
      showTooltip(formula);
    }
  }, 50);

  const leaveHandler = utils.debounce(hideTooltip, 50);

  formula.element.addEventListener("click", clickHandler);
  formula.element.addEventListener("mouseenter", enterHandler);
  formula.element.addEventListener("mouseleave", leaveHandler);

  domCache.handlers.set("click", clickHandler);
  domCache.handlers.set("mouseenter", enterHandler);
  domCache.handlers.set("mouseleave", leaveHandler);

  formula.element.style.cursor = "pointer";
  formula.element.classList.add("formula-interactive");
}

// Start extension with delayed initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Cleanup on page unload
window.addEventListener("unload", () => {
  if (initTimeout) {
    clearTimeout(initTimeout);
  }
  performanceCache.formulaCache.clear();
  performanceCache.colorCache.clear();
  formulaStore.formulas.clear();
  formulaStore.variables.clear();
});
