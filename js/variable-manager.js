// Variable selection and color management system
class VariableManager {
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
        "#4CAF50",
        "#2196F3",
        "#F44336",
        "#FFC107",
        "#9C27B0",
        "#FF9800",
        "#795548",
        "#607D8B",
        "#E91E63",
        "#3F51B5",
      ],
      activeIndex: 0,
    };
  }

  createVariablePanel() {
    const panel = document.createElement("div");
    panel.className = "variable-panel";
    panel.innerHTML = `
      <div class="variable-panel-header">
        <h3>Variables</h3>
        <button class="close-panel">×</button>
      </div>
      <div class="variable-list"></div>
      <div class="color-picker">
        <div class="color-swatches"></div>
        <input type="color" class="custom-color" value="${this.activeColor}">
      </div>
      <div class="variable-actions">
        <button class="clear-selections">Clear All</button>
        <button class="apply-color">Apply Color</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
    this.renderColorPicker();
  }

  renderColorPicker() {
    const swatchesContainer = this.panel.querySelector(".color-swatches");
    swatchesContainer.innerHTML = this.colorPicker.colors
      .map(
        (color, index) => `
        <div class="color-swatch ${
          index === this.colorPicker.activeIndex ? "active" : ""
        }"
             style="background-color: ${color}"
             data-color="${color}">
        </div>
      `
      )
      .join("");
  }

  setupEventListeners() {
    // Color picker events
    this.panel
      .querySelector(".color-swatches")
      .addEventListener("click", (e) => {
        const swatch = e.target.closest(".color-swatch");
        if (swatch) {
          this.setActiveColor(swatch.dataset.color);
          this.updateColorSwatchUI();
        }
      });

    // Custom color input
    this.panel
      .querySelector(".custom-color")
      .addEventListener("change", (e) => {
        this.setActiveColor(e.target.value);
      });

    // Panel controls
    this.panel.querySelector(".close-panel").addEventListener("click", () => {
      this.panel.classList.remove("visible");
    });

    this.panel
      .querySelector(".clear-selections")
      .addEventListener("click", () => {
        this.clearSelections();
      });

    this.panel.querySelector(".apply-color").addEventListener("click", () => {
      this.applyColorToSelected();
    });

    // Variable selection in formulas
    document.addEventListener("mouseup", () => {
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        this.handleVariableSelection(selection);
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.panel.classList.remove("visible");
      }
    });
  }

  handleVariableSelection(selection) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.parentElement;

    if (container.closest("[data-math-enhanced]")) {
      const selectedText = selection.toString().trim();
      if (this.isValidVariable(selectedText)) {
        this.addVariable(selectedText, range);
        this.showVariablePanel(range);
      }
    }
  }

  isValidVariable(text) {
    // Check if the selected text matches variable pattern
    return /^[a-zA-Z]$/.test(text) || /^[a-zA-Z]_[a-zA-Z0-9]+$/.test(text);
  }

  addVariable(variable, range) {
    if (!this.variables.has(variable)) {
      this.variables.set(variable, {
        occurrences: [],
        color: null,
      });
    }

    this.variables.get(variable).occurrences.push(range);
    this.selectedVariables.add(variable);
    this.updateVariableList();
  }

  updateVariableList() {
    const listContainer = this.panel.querySelector(".variable-list");
    listContainer.innerHTML = Array.from(this.variables.entries())
      .map(
        ([variable, data]) => `
        <div class="variable-item ${
          this.selectedVariables.has(variable) ? "selected" : ""
        }"
             data-variable="${variable}">
          <span class="variable-name">${variable}</span>
          <span class="variable-color" style="background-color: ${
            data.color || "transparent"
          }"></span>
          <span class="occurrence-count">${data.occurrences.length}</span>
        </div>
      `
      )
      .join("");
  }

  showVariablePanel(rangeOrRect) {
    let top, left;

    if (rangeOrRect instanceof Range) {
      const rect = rangeOrRect.getBoundingClientRect();
      top = rect.bottom + window.scrollY + 10;
      left = rect.left + window.scrollX;
    } else {
      // Assume it's a DOMRect
      top = rangeOrRect.bottom + window.scrollY + 10;
      left = rangeOrRect.left + window.scrollX;
    }

    this.panel.style.top = `${top}px`;
    this.panel.style.left = `${left}px`;
    this.panel.classList.add("visible");
  }

  setActiveColor(color) {
    this.activeColor = color;
    this.panel.querySelector(".custom-color").value = color;
  }

  updateColorSwatchUI() {
    const swatches = this.panel.querySelectorAll(".color-swatch");
    swatches.forEach((swatch) => {
      swatch.classList.toggle(
        "active",
        swatch.dataset.color === this.activeColor
      );
    });
  }

  applyColorToSelected() {
    this.selectedVariables.forEach((variable) => {
      const varData = this.variables.get(variable);
      varData.color = this.activeColor;

      varData.occurrences.forEach((range) => {
        const span = document.createElement("span");
        span.style.color = this.activeColor;
        span.style.fontWeight = "bold";
        span.textContent = variable;

        range.deleteContents();
        range.insertNode(span);
      });
    });

    this.updateVariableList();
  }

  clearSelections() {
    this.selectedVariables.clear();
    this.updateVariableList();
  }

  updateVariableList(variables = []) {
    const variableList = this.panel.querySelector(".variable-list");

    // Clear existing list
    variableList.innerHTML = "";

    // Add variables to the list
    variables.forEach((variable) => {
      const variableItem = document.createElement("div");
      variableItem.className = "variable-item";
      variableItem.innerHTML = `
        <label class="variable-label">
          <input type="checkbox" 
                 class="variable-checkbox" 
                 value="${variable}" 
                 ${this.selectedVariables.has(variable) ? "checked" : ""}>
          <span class="variable-name">${variable}</span>
        </label>
        <div class="variable-color" 
             style="background-color: ${
               this.colorMap.get(variable) || this.activeColor
             }">
        </div>
      `;

      // Add event listeners
      const checkbox = variableItem.querySelector(".variable-checkbox");
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedVariables.add(variable);
        } else {
          this.selectedVariables.delete(variable);
        }
      });

      variableList.appendChild(variableItem);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.variableManager = new VariableManager();
  window.variableManager.init();
});
