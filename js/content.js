// Content script for LaTeX Formula Colorizer

// Store for formula data
const formulaStore = {
  formulas: new Map(),
  variables: new Set(),
  sections: new Map(),
  selectedVariables: new Set(),
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
  const variables = new Set();

  // Variable patterns
  const patterns = [
    // Single letters with optional subscripts
    /(?<!\\)[a-zA-Z](?:_[a-zA-Z0-9]+)?/g,
    // Greek letters
    /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)(?:_[a-zA-Z0-9]+)?/g,
    // Vector/matrix variables
    /\\(?:vec|mathbf)\{([a-zA-Z])\}/g,
  ];

  patterns.forEach((pattern) => {
    const matches = latex.matchAll(pattern);
    for (const match of matches) {
      const variable = cleanVariable(match[0]);
      if (variable && !isLatexCommand(variable)) {
        variables.add(variable);
      }
    }
  });

  return Array.from(variables);
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
    const variableEl = document.createElement("div");
    variableEl.className = "math-variable-item";
    variableEl.innerHTML = `
      <label>
        <input type="checkbox" value="${variable}" 
          ${formulaStore.selectedVariables.has(variable) ? "checked" : ""}>
        <span class="variable-name">${variable}</span>
        <span class="variable-color" style="background-color: ${getVariableColor(
          variable
        )}"></span>
      </label>
    `;

    const checkbox = variableEl.querySelector("input");
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

// Get color for variable
function getVariableColor(variable) {
  let hash = 0;
  for (let i = 0; i < variable.length; i++) {
    hash = (hash << 5) - hash + variable.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
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
  });

  // Add highlights for selected variables
  if (formulaStore.selectedVariables.size > 0) {
    formulaStore.formulas.forEach((formula) => {
      const hasSelected = formula.variables.some((v) =>
        formulaStore.selectedVariables.has(v)
      );
      if (hasSelected) {
        formula.element.classList.add("formula-highlight");
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
