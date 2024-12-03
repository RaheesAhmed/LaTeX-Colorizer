// Add these variables at the top of the file
let isInitialized = false;
let initTimeout = null;

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
        .replace(/^(mathbf|vec|hat|bar|tilde)/, "")
        .replace(/\\([a-zA-Z]+)(?![a-zA-Z])/, "$1")
        .replace(/\s+/g, "")
        .replace(/\\/, "")
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
      "operatorname",
      "overline",
      "widehat",
      "prod",
      "min",
      "max",
      "arg",
      "sup",
      "inf",
      "matrix",
      "pmatrix",
      "bmatrix",
      "vmatrix",
      "array",
      "align",
      "aligned",
      "gathered",
      "hat",
      "bar",
      "tilde",
      "vec",
      "dot",
      "partial",
      "nabla",
      "propto",
      "approx",
      "quad",
      "qquad",
      "space",
      "hspace",
      "vspace",
      "displaystyle",
      "scriptstyle",
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

      // Enhanced set of common variables for OLS
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
        "ε",
        "σ",
        "μ",
        "X",
        "Y",
        "β̂",
        "ε̂",
        "R²",
        "MSE",
        "RSS",
        "TSS",
        "ESS",
      ]);

      // Enhanced patterns for OLS notation
      const patterns = [
        // Basic variables
        /(?<!\\)[a-zA-Z](?![\d\s=+\-*/\\])/g,

        // Greek letters
        /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?![a-zA-Z])/gi,

        // Subscripted variables
        /([a-zA-Z])_([a-zA-Z0-9]+)/g,

        // Vector/matrix notation
        /\\(?:vec|mathbf)\{([a-zA-Z])\}/g,

        // Hat notation for estimates
        /\\hat\{([^}]+)\}/g,

        // Matrix transpose
        /([a-zA-Z])^T/g,

        // Statistical notation
        /\\(?:sum|prod|frac|sqrt|operatorname)\{([^}]+)\}/g,

        // Subscripts with multiple characters
        /([a-zA-Z])_{([^}]+)}/g,
      ];

      patterns.forEach((pattern) => {
        const matches = cleanLatex.matchAll(pattern);
        for (const match of matches) {
          const variable = this.cleanVariable(match[0]);
          if (variable && !this.isLatexCommand(variable)) {
            // Enhanced variable filtering
            if (commonVars.has(variable)) {
              variables.add(variable);
            } else if (
              variable.length === 1 ||
              variable.includes("_") ||
              variable.includes("^") ||
              /[A-Z]/.test(variable) || // Capital letters for matrices
              variable.includes("hat") // Estimated parameters
            ) {
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

// Initialize variable panel
const variablePanel = {
  initialized: false,
  colorMap: new Map(),

  init() {
    if (this.initialized) return;

    this.panel = document.createElement("div");
    this.panel.className = "variable-panel";
    this.panel.innerHTML = `
      <div class="panel-header">
        <h3>Variables</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="variables-list"></div>
      <div class="panel-footer">
        <button class="clear-btn">Clear All</button>
        <button class="apply-btn">Apply Color</button>
      </div>
    `;
    document.body.appendChild(this.panel);
    this.setupListeners();
    this.initialized = true;

    // Add styles
    if (!document.querySelector("#variable-panel-styles")) {
      const style = document.createElement("style");
      style.id = "variable-panel-styles";
      style.textContent = `
        .variable-panel {
          position: absolute;
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 16px;
          min-width: 300px;
          z-index: 10000;
          display: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        
        .variable-panel.visible {
          display: block;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: #333;
          font-weight: 500;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: #666;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: #f5f5f5;
        }
        
        .variables-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 12px;
          padding-right: 8px;
        }

        .variables-list::-webkit-scrollbar {
          width: 8px;
        }

        .variables-list::-webkit-scrollbar-track {
          background: #f5f5f5;
          border-radius: 4px;
        }

        .variables-list::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 4px;
        }
        
        .variable-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border: 1px solid #eee;
          border-radius: 4px;
          margin-bottom: 4px;
          background: #fff;
          transition: background-color 0.2s;
        }

        .variable-item:hover {
          background: #f8f9fa;
        }
        
        .variable-item label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex: 1;
          user-select: none;
        }

        .variable-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          border: 2px solid #ddd;
          border-radius: 3px;
          cursor: pointer;
        }
        
        .variable-name {
          font-family: "Times New Roman", serif;
          font-style: italic;
          font-size: 16px;
          flex: 1;
        }
        
        .color-control {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        
        .color-indicator {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #ddd;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .color-indicator:hover {
          transform: scale(1.1);
        }
        
        .color-picker {
          opacity: 0;
          width: 24px;
          height: 24px;
          position: absolute;
          cursor: pointer;
          right: 0;
        }
        
        .panel-footer {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          border-top: 1px solid #eee;
          padding-top: 12px;
        }
        
        .panel-footer button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: #f5f5f5;
        }
        
        .apply-btn {
          background: #2196f3 !important;
          color: white;
          border-color: #2196f3 !important;
        }
        
        .apply-btn:hover {
          background: #1976d2 !important;
        }

        .empty-state {
          text-align: center;
          padding: 24px;
          color: #666;
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }
  },

  setupListeners() {
    const closeBtn = this.panel.querySelector(".close-btn");
    const clearBtn = this.panel.querySelector(".clear-btn");
    const applyBtn = this.panel.querySelector(".apply-btn");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const checkboxes = this.panel.querySelectorAll(
          'input[type="checkbox"]'
        );
        checkboxes.forEach((cb) => {
          cb.checked = false;
        });
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const selectedVars = Array.from(
          this.panel.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => cb.value);
        this.applyColors(selectedVars);
      });
    }
  },

  show(formula, position) {
    if (!this.initialized) {
      this.init();
    }

    if (!formula || !position) {
      console.error("Invalid formula or position provided");
      return;
    }

    const variables = this.extractVariables(formula.latex || "");
    this.currentFormula = formula;

    const listContainer = this.panel.querySelector(".variables-list");
    if (!listContainer) {
      console.error("Variables list container not found");
      return;
    }

    if (variables.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          No variables found in this equation
        </div>
      `;
    } else {
      listContainer.innerHTML = variables
        .map(
          (v) => `
        <div class="variable-item">
          <label>
            <input type="checkbox" value="${v}">
            <span class="variable-name">${v}</span>
          </label>
          <div class="color-control">
            <input type="color" class="color-picker" value="${this.getVariableColor(
              v
            )}" data-variable="${v}">
            <div class="color-indicator" style="background-color: ${this.getVariableColor(
              v
            )}"></div>
          </div>
        </div>
      `
        )
        .join("");

      // Add color picker listeners
      listContainer.querySelectorAll(".color-picker").forEach((picker) => {
        picker.addEventListener("input", (e) => {
          const variable = e.target.dataset.variable;
          const color = e.target.value;
          this.colorMap.set(variable, color);
          e.target.nextElementSibling.style.backgroundColor = color;
        });
      });
    }

    // Position panel
    const rect = formula.element.getBoundingClientRect();
    const panelRect = this.panel.getBoundingClientRect();

    let top = position.bottom + window.scrollY + 5;
    let left = position.left + window.scrollX;

    // Adjust position if panel would go off screen
    if (left + panelRect.width > window.innerWidth) {
      left = window.innerWidth - panelRect.width - 10;
    }
    if (top + panelRect.height > window.innerHeight + window.scrollY) {
      top = position.top + window.scrollY - panelRect.height - 5;
    }

    this.panel.style.top = `${top}px`;
    this.panel.style.left = `${left}px`;
    this.panel.classList.add("visible");
  },

  hide() {
    this.panel.classList.remove("visible");
  },

  extractVariables(latex) {
    console.log("Extracting variables from LaTeX:", latex);
    if (!latex) return [];

    // Clean up LaTeX
    latex = latex
      .replace(/\\displaystyle\s*/g, "")
      .replace(/\\operatorname\s*\{([^}]+)\}/g, "$1")
      .replace(/\\left|\\right/g, "")
      .replace(/\\,/g, "")
      .replace(/\s+/g, "\\") // Normalize backslashes
      .trim();

    console.log("Cleaned LaTeX:", latex);
    const variables = new Set();

    // Extract variables with their subscripts
    const patterns = [
      // Greek letters with optional subscripts
      {
        pattern:
          /\\(?:alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?:_\{[^}]+\})?/g,
        type: "greek",
      },
      // Bold symbols with subscripts
      {
        pattern: /\\(?:mathbf|boldsymbol)\{([^}]+)\}(?:_\{[^}]+\})?/g,
        type: "bold",
      },
      // Variables with numeric subscripts
      {
        pattern: /([a-zA-Z])_\{(\d+)\}/g,
        type: "subscripted",
      },
      // Variables with letter subscripts
      {
        pattern: /([a-zA-Z])_\{([a-zA-Z])\}/g,
        type: "subscripted",
      },
      // Single letters (not part of commands)
      {
        pattern: /(?<![\\{])([a-zA-Z])(?![a-zA-Z}])/g,
        type: "letter",
      },
    ];

    // Process each pattern
    patterns.forEach(({ pattern, type }) => {
      const matches = latex.matchAll(pattern);
      for (const match of matches) {
        let variable = match[1] || match[0];
        console.log(`Found ${type} variable:`, variable);

        // Clean up the variable
        variable = variable
          .replace(/^[^a-zA-Z\\]+/, "")
          .replace(/[^a-zA-Z]+$/, "");

        // Handle Greek letters
        if (variable.startsWith("\\")) {
          const mapping = {
            "\\alpha": "α",
            "\\beta": "β",
            "\\gamma": "γ",
            "\\delta": "δ",
            "\\epsilon": "ε",
            "\\varepsilon": "ε",
            "\\zeta": "ζ",
            "\\eta": "η",
            "\\theta": "θ",
            "\\iota": "ι",
            "\\kappa": "κ",
            "\\lambda": "λ",
            "\\mu": "μ",
            "\\nu": "ν",
            "\\xi": "ξ",
            "\\pi": "π",
            "\\rho": "ρ",
            "\\sigma": "σ",
            "\\tau": "τ",
            "\\upsilon": "υ",
            "\\phi": "φ",
            "\\chi": "χ",
            "\\psi": "ψ",
            "\\omega": "ω",
          };
          const greekSymbol = mapping[variable];
          if (greekSymbol) {
            console.log(
              "Converted Greek symbol:",
              variable,
              "to:",
              greekSymbol
            );
            variable = greekSymbol;
          }
        }

        // Extract base variable from subscripted form
        if (type === "subscripted") {
          const baseVar = variable.split("_")[0];
          if (baseVar) {
            console.log("Adding base variable:", baseVar);
            variables.add(baseVar);
          }
        } else if (
          variable &&
          (variable.match(/^[a-zA-Z]$/) || variable.match(/^[α-ωΑ-Ω]$/))
        ) {
          console.log("Adding variable:", variable);
          variables.add(variable);
        }

        // For bold symbols, also add the inner variable
        if (type === "bold" && variable.match(/^[a-zA-Z]$/)) {
          console.log("Adding bold variable:", variable);
          variables.add(variable);
        }
      }
    });

    // Special handling for common mathematical variables
    const specialVars = ["x", "y", "z", "n", "i", "j", "k", "p", "q", "r"];
    specialVars.forEach((v) => {
      if (latex.includes(v)) {
        const beforeChar = latex[latex.indexOf(v) - 1] || "";
        const afterChar = latex[latex.indexOf(v) + 1] || "";
        if (!/[a-zA-Z\\{}]/.test(beforeChar) && !/[a-zA-Z}]/.test(afterChar)) {
          console.log("Adding special variable:", v);
          variables.add(v);
        }
      }
    });

    // Process subscripted forms separately
    const subscriptPattern = /([a-zA-Z])_\{([^}]+)\}/g;
    let match;
    while ((match = subscriptPattern.exec(latex)) !== null) {
      const baseVar = match[1];
      if (baseVar) {
        console.log("Adding subscripted base variable:", baseVar);
        variables.add(baseVar);
      }
    }

    const result = Array.from(variables).sort();
    console.log("Extracted variables:", result);
    return result;
  },

  getVariableColor(variable) {
    if (this.colorMap.has(variable)) {
      return this.colorMap.get(variable);
    }

    // Default colors for common variables (all in hex format)
    const defaultColors = {
      x: "#FF4444",
      y: "#44FF44",
      z: "#4444FF",
      i: "#FF44FF",
      n: "#FFB366",
      t: "#66B3FF",
      α: "#FF66B3",
      β: "#B366FF",
      γ: "#66FFB3",
      δ: "#FFB366",
      ε: "#66B3FF",
      θ: "#B3FF66",
      λ: "#FF66B3",
      μ: "#66B3FF",
      π: "#FFB366",
      σ: "#B366FF",
      τ: "#66FFB3",
      φ: "#FF66B3",
      ω: "#66B3FF",
      a: "#FF9966",
      b: "#66FF99",
      c: "#9966FF",
      d: "#FF6699",
      f: "#99FF66",
      g: "#6699FF",
      h: "#FF6666",
      j: "#66FF66",
      k: "#6666FF",
      l: "#FF66FF",
      m: "#FFFF66",
      p: "#66FFFF",
      q: "#FF9999",
      r: "#99FF99",
      s: "#9999FF",
      u: "#FF99FF",
      v: "#FFFF99",
      w: "#99FFFF",
    };

    const color = defaultColors[variable] || this.generateRandomColor();
    this.colorMap.set(variable, color);
    return color;
  },

  generateRandomColor() {
    // Generate hex color instead of HSL
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  },

  applyColors(selectedVariables) {
    console.log("Applying colors to variables:", selectedVariables);
    if (!this.currentFormula || !this.currentFormula.element) {
      console.error("No current formula or element");
      return;
    }

    try {
      // Get the original elements
      const mathmlContainer = this.currentFormula.element.querySelector(
        ".mwe-math-mathml-a11y"
      );
      const svgContainer = this.currentFormula.element.querySelector(
        ".mwe-math-fallback-image-inline"
      );

      if (!mathmlContainer) {
        console.error("Could not find MathML container");
        return;
      }

      // Create a map of variables and their colors
      const variables = new Map();
      selectedVariables.forEach((variable) => {
        const color =
          this.colorMap.get(variable) || this.getVariableColor(variable);
        variables.set(variable, color);
      });

      // Function to process a node and its children
      const processNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Handle mi elements (math identifiers)
          if (node.tagName.toLowerCase() === "mi") {
            const text = node.textContent.trim();
            variables.forEach((color, variable) => {
              if (text === variable) {
                node.style.setProperty("color", color, "important");
                node.style.setProperty("font-weight", "bold", "important");
                node.style.setProperty("opacity", "1", "important");
              }
            });
          }

          // Handle mtext elements (math text)
          if (node.tagName.toLowerCase() === "mtext") {
            let text = node.textContent;
            let modified = false;
            variables.forEach((color, variable) => {
              if (text.includes(variable)) {
                modified = true;
                text = text.replace(
                  new RegExp(variable, "g"),
                  `<span style="color: ${color}; font-weight: bold; opacity: 1;">${variable}</span>`
                );
              }
            });
            if (modified) {
              node.innerHTML = text;
            }
          }

          // Process child nodes
          Array.from(node.children).forEach(processNode);
        }
      };

      // Get all math elements
      const mathElements = mathmlContainer.getElementsByTagName("math");
      if (!mathElements.length) {
        console.error("Could not find math elements");
        return;
      }

      // Process each math element
      Array.from(mathElements).forEach(processNode);

      // Show MathML and adjust SVG
      mathmlContainer.style.removeProperty("display");
      mathmlContainer.style.setProperty("visibility", "visible", "important");
      mathmlContainer.style.setProperty("position", "relative", "important");
      mathmlContainer.style.setProperty("clip", "auto", "important");
      mathmlContainer.style.setProperty("width", "auto", "important");
      mathmlContainer.style.setProperty("height", "auto", "important");
      mathmlContainer.style.setProperty("overflow", "visible", "important");
      mathmlContainer.style.setProperty("opacity", "1", "important");
      mathmlContainer.style.setProperty("z-index", "1", "important");

      if (svgContainer) {
        svgContainer.style.setProperty("display", "none", "important");
      }

      // Add or update CSS for MathML visibility
      let mathStyles = document.getElementById("math-styles");
      if (!mathStyles) {
        mathStyles = document.createElement("style");
        mathStyles.id = "math-styles";
        document.head.appendChild(mathStyles);
      }

      mathStyles.textContent = `
        .mwe-math-mathml-a11y {
          display: inline-block !important;
          visibility: visible !important;
          position: relative !important;
          clip: auto !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
          opacity: 1 !important;
          z-index: 1 !important;
        }
        .mwe-math-mathml-a11y > math {
          display: inline-block !important;
          visibility: visible !important;
          background: white !important;
          padding: 2px !important;
          border-radius: 3px !important;
          opacity: 1 !important;
        }
        .mwe-math-fallback-image-inline {
          display: none !important;
        }
        .mwe-math-element {
          display: inline-block !important;
        }
      `;

      // Force a reflow to ensure styles are applied
      mathmlContainer.offsetHeight;

      console.log("Successfully applied colors to formula");
    } catch (err) {
      console.error("Error in applyColors:", err);
    }
  },

  // Helper method to safely get text content
  getTextContent(node) {
    try {
      return node ? node.textContent : "";
    } catch (err) {
      console.error("Error getting text content:", err);
      return "";
    }
  },

  // Helper method to safely check if element exists
  elementExists(element) {
    return (
      element &&
      element.parentNode &&
      element.parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
    );
  },
};

// Handle formula clicks
function handleFormulaClick(formula) {
  if (!formula || !formula.element) {
    console.error("Invalid formula object provided to handleFormulaClick");
    return;
  }

  const rect = formula.element.getBoundingClientRect();
  if (!rect) {
    console.error("Could not get bounding rectangle for formula element");
    return;
  }

  variablePanel.show(formula, rect);
}

// Initialize the extension
function initializeExtension() {
  if (isInitialized) return;

  console.log("Initializing LaTeX Formula Colorizer...");

  // Initialize the variable panel
  variablePanel.init();

  // Find and process math elements
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
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initTimeout = setTimeout(initializeExtension, 1000);
  });
} else {
  initTimeout = setTimeout(initializeExtension, 1000);
}

// Cleanup on unload
window.addEventListener("unload", () => {
  if (initTimeout) {
    clearTimeout(initTimeout);
  }
});

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

// Handle settings changes
function handleSettingsChange(settings) {
  console.log("Settings changed:", settings);
  // Implement settings change logic here
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "applyColors") {
    const colors = message.colors;

    // Variable mapping between LaTeX commands and Unicode
    const variableMapping = {
      β: ["\\beta", "β"],
      ε: ["\\varepsilon", "ε"],
      α: ["\\alpha", "α"],
      γ: ["\\gamma", "γ"],
      θ: ["\\theta", "θ"],
      μ: ["\\mu", "μ"],
      π: ["\\pi", "π"],
      σ: ["\\sigma", "σ"],
    };

    // Find all formulas
    document.querySelectorAll(".formula-interactive").forEach((formula) => {
      const text = formula.textContent;
      const latex =
        formula.dataset.latex || formula.getAttribute("data-latex") || "";

      // Create a document fragment to hold the colored text
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      // Sort variables by length (longest first) to handle overlapping matches
      const variables = Object.keys(colors).sort((a, b) => b.length - a.length);

      // Find and color all variables
      variables.forEach((variable) => {
        // Get all possible representations of the variable
        let patterns = [variable];
        if (variableMapping[variable]) {
          patterns = patterns.concat(variableMapping[variable]);
        }

        // Create regex pattern for all representations
        const regexPattern = patterns
          .map((p) => p.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
          .join("|");
        const regex = new RegExp(regexPattern, "g");

        // Try to match in both text content and LaTeX
        [text, latex].forEach((content) => {
          if (!content) return;

          let match;
          while ((match = regex.exec(content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
              fragment.appendChild(
                document.createTextNode(content.slice(lastIndex, match.index))
              );
            }

            // Create colored span for the variable
            const span = document.createElement("span");
            span.style.color = colors[variable];
            span.style.fontWeight = "bold";
            span.className = "colored-variable";
            span.textContent = match[0];
            fragment.appendChild(span);

            lastIndex = match.index + match[0].length;
          }
        });
      });

      // Add any remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      // Replace formula content
      formula.textContent = ""; // Clear existing content
      formula.appendChild(fragment);
    });

    sendResponse({ success: true });
  }
  return true;
});
