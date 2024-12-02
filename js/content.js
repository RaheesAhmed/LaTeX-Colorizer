// Content script for Wikipedia Math Formula Enhancer

class WikiMathEnhancer {
  constructor() {
    this.mathElements = [];
    this.variableMap = new Map();
    this.renderQueue = [];
    this.observer = null;
    this.settings = {
      enabled: true,
      autoRender: true,
      displayMode: "block",
    };
  }

  async init() {
    await this.loadSettings();
    if (!this.settings.enabled) return;

    this.setupMutationObserver();
    this.findMathElements();
    await this.processFormulas();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["enabled", "autoRender", "displayMode"],
        (data) => {
          this.settings = {
            enabled: data.enabled ?? true,
            autoRender: data.autoRender ?? true,
            displayMode: data.displayMode ?? "block",
          };
          resolve();
        }
      );
    });
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (this.containsMathContent(mutation)) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) {
        this.findMathElements();
        this.processFormulas();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  containsMathContent(mutation) {
    const mathSelectors = [
      ".mwe-math-element",
      ".mwe-math-fallback-image-inline",
      ".tex",
    ];
    if (mutation.type === "childList") {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            mathSelectors.some(
              (selector) =>
                node.matches?.(selector) || node.querySelector?.(selector)
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  findMathElements() {
    const newElements = [
      ...document.querySelectorAll(".mwe-math-element"),
      ...document.querySelectorAll(".mwe-math-fallback-image-inline"),
      ...document.querySelectorAll(".tex"),
    ].filter((element) => !element.hasAttribute("data-math-enhanced"));

    this.mathElements.push(...newElements);
    this.renderQueue.push(...newElements);
  }

  async processFormulas() {
    const batchSize = 5;
    while (this.renderQueue.length > 0) {
      const batch = this.renderQueue.splice(0, batchSize);
      await Promise.all(batch.map((element) => this.enhanceFormula(element)));
      // Small delay to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async enhanceFormula(element) {
    try {
      const texContent = this.extractTeX(element);
      if (!texContent) return;

      const variables = this.identifyVariables(texContent);
      this.updateVariableMap(variables);

      const isInline = element.classList.contains(
        "mwe-math-fallback-image-inline"
      );
      const renderedMath = await this.renderFormula(texContent, isInline);

      element.innerHTML = renderedMath;
      element.setAttribute("data-math-enhanced", "true");
      element.setAttribute("data-formula", texContent);

      this.attachFormulaHandlers(element);
    } catch (error) {
      console.warn("Error enhancing formula:", error);
      this.handleRenderError(element, error);
    }
  }

  extractTeX(element) {
    // Try different methods to extract TeX content
    const texContent =
      element.getAttribute("alt") ||
      element.getAttribute("data-tex") ||
      element.textContent;

    if (!texContent) return null;

    // Clean up Wikipedia-specific LaTeX syntax
    return this.cleanTeXContent(texContent);
  }

  cleanTeXContent(tex) {
    // Handle Wikipedia's specific LaTeX syntax
    return tex
      .replace(/\\begin{(?:align|equation|gather)}/g, "")
      .replace(/\\end{(?:align|equation|gather)}/g, "")
      .replace(/\\displaystyle/g, "")
      .trim();
  }

  identifyVariables(texContent) {
    const variables = new Set();
    // Match single letters that are likely variables
    const varRegex = /(?<!\\)[a-zA-Z](?!\w)/g;
    // Match common mathematical functions
    const mathFuncs = [
      "sin",
      "cos",
      "tan",
      "log",
      "ln",
      "exp",
      "lim",
      "sum",
      "int",
    ];

    const matches = texContent.match(varRegex) || [];
    for (const match of matches) {
      // Exclude if it's part of a math function
      if (!mathFuncs.some((func) => texContent.includes(`\\${func}`))) {
        variables.add(match);
      }
    }
    return variables;
  }

  updateVariableMap(variables) {
    variables.forEach((variable) => {
      if (!this.variableMap.has(variable)) {
        this.variableMap.set(variable, {
          occurrences: 0,
          formulas: new Set(),
        });
      }
      const varInfo = this.variableMap.get(variable);
      varInfo.occurrences++;
    });
  }

  async renderFormula(texContent, isInline) {
    return katex.renderToString(texContent, {
      throwOnError: false,
      errorColor: "#cc0000",
      displayMode: !isInline,
      strict: false,
      trust: true,
      macros: this.getCustomMacros(),
    });
  }

  getCustomMacros() {
    // Common Wikipedia math macros
    return {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\Q": "\\mathbb{Q}",
      "\\C": "\\mathbb{C}",
    };
  }

  attachFormulaHandlers(element) {
    element.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.showFormulaDetails(element);
      }
    });

    element.title = "Ctrl+Click to show formula details";
  }

  showFormulaDetails(element) {
    const texContent = element.getAttribute("data-formula");
    const variables = this.identifyVariables(texContent);

    const details = document.createElement("div");
    details.className = "math-details";
    details.innerHTML = `
      <div class="math-details-content">
        <h3>Formula Details</h3>
        <p><strong>LaTeX:</strong> <code>${texContent}</code></p>
        <p><strong>Variables:</strong> ${
          Array.from(variables).join(", ") || "None"
        }</p>
      </div>
    `;

    // Position the details popup
    const rect = element.getBoundingClientRect();
    details.style.position = "absolute";
    details.style.top = `${rect.bottom + window.scrollY}px`;
    details.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(details);

    // Remove on click outside
    const removeDetails = (e) => {
      if (!details.contains(e.target)) {
        details.remove();
        document.removeEventListener("click", removeDetails);
      }
    };
    setTimeout(() => document.addEventListener("click", removeDetails), 0);
  }

  handleRenderError(element, error) {
    element.classList.add("math-error");
    element.innerHTML = `
      <div class="math-error-content">
        <span>Error rendering formula</span>
        <small>${error.message}</small>
      </div>
    `;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const enhancer = new WikiMathEnhancer();
  await enhancer.init();
});
