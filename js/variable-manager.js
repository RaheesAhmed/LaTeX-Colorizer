// Variable selection and color management system
export class VariableManager {
  constructor() {
    this.variables = new Map();
    this.selectedVariables = new Set();
    this.colorMap = new Map();
    this.activeColor = "#4CAF50";
    this.setupColorPicker();
  }

  init() {
    this.createVariablePanel();
    this.setupEventListeners();
  }

  setupColorPicker() {
    this.colorPicker = {
      colors: [
        "#4CAF50", // Green
        "#2196F3", // Blue
        "#F44336", // Red
        "#FFC107", // Amber
        "#9C27B0", // Purple
        "#FF9800", // Orange
        "#795548", // Brown
        "#607D8B", // Blue Grey
        "#E91E63", // Pink
        "#3F51B5", // Indigo
      ],
      activeIndex: 0,
    };
  }

  createVariablePanel() {
    const panel = document.createElement("div");
    panel.className = "variable-panel";
    panel.innerHTML = `
      <div class="formula-controls">
        <h3>Formula Controls</h3>
        <div class="variable-list">
          ${this.createVariableList()}
        </div>
        <div class="size-controls">
          <h4>Size</h4>
          <div class="size-options">
            <label>
              <input type="radio" name="size" value="small">
              Small
            </label>
            <label>
              <input type="radio" name="size" value="standard" checked>
              Standard
            </label>
            <label>
              <input type="radio" name="size" value="large">
              Large
            </label>
          </div>
        </div>
        <div class="width-controls">
          <h4>Width</h4>
          <div class="width-options">
            <label>
              <input type="radio" name="width" value="standard" checked>
              Standard
            </label>
            <label>
              <input type="radio" name="width" value="wide">
              Wide
            </label>
          </div>
        </div>
        <div class="color-controls">
          <h4>Color (beta)</h4>
          <div class="color-options">
            <label>
              <input type="radio" name="color" value="automatic">
              Automatic
            </label>
            <label>
              <input type="radio" name="color" value="light" checked>
              Light
            </label>
            <label>
              <input type="radio" name="color" value="dark">
              Dark
            </label>
          </div>
        </div>
        <button class="clear-all">Clear All</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
  }

  createVariableList() {
    return Array.from(this.variables.entries())
      .map(
        ([variable, data]) => `
        <div class="variable-item">
          <label class="variable-checkbox">
            <input type="checkbox" 
              ${this.selectedVariables.has(variable) ? "checked" : ""}
              data-variable="${variable}">
            <span class="variable-name">${variable}</span>
          </label>
          <div class="variable-color" style="background-color: ${
            data.color || "transparent"
          }"></div>
        </div>
      `
      )
      .join("");
  }

  setupEventListeners() {
    // Variable selection
    this.panel.addEventListener("change", (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        const variable = e.target.dataset.variable;
        if (e.target.checked) {
          this.selectedVariables.add(variable);
        } else {
          this.selectedVariables.delete(variable);
        }
        this.updateVariableList();
      }
    });

    // Clear all button
    this.panel.querySelector(".clear-all").addEventListener("click", () => {
      this.clearSelections();
    });

    // Size controls
    this.panel.querySelectorAll('input[name="size"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.updateFormulaSize(e.target.value);
      });
    });

    // Width controls
    this.panel.querySelectorAll('input[name="width"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.updateFormulaWidth(e.target.value);
      });
    });

    // Color controls
    this.panel.querySelectorAll('input[name="color"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.updateFormulaColor(e.target.value);
      });
    });
  }

  showPanel(formula) {
    const rect = formula.element.getBoundingClientRect();
    this.panel.style.top = `${rect.bottom + window.scrollY + 10}px`;
    this.panel.style.left = `${rect.left + window.scrollX}px`;
    this.panel.classList.add("visible");

    // Parse and add variables from the formula
    const variables = formula.variables || [];
    variables.forEach((variable) => {
      if (!this.variables.has(variable)) {
        this.variables.set(variable, { color: null });
      }
    });

    this.updateVariableList();
  }

  hidePanel() {
    this.panel.classList.remove("visible");
  }

  updateVariableList() {
    const listContainer = this.panel.querySelector(".variable-list");
    listContainer.innerHTML = this.createVariableList();
  }

  clearSelections() {
    this.selectedVariables.clear();
    this.updateVariableList();
  }

  updateFormulaSize(size) {
    document.querySelectorAll(".formula-interactive").forEach((formula) => {
      formula.dataset.size = size;
    });
  }

  updateFormulaWidth(width) {
    document.querySelectorAll(".formula-interactive").forEach((formula) => {
      formula.dataset.width = width;
    });
  }

  updateFormulaColor(color) {
    document.querySelectorAll(".formula-interactive").forEach((formula) => {
      formula.dataset.color = color;
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.variableManager = new VariableManager();
  window.variableManager.init();
});
