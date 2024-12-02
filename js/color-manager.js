// Advanced color management system for formula enhancement
class ColorManager {
  constructor() {
    this.palettes = new Map();
    this.activeColors = new Set();
    this.colorRules = new Map();
    this.currentPalette = "default";
    this.contrastThreshold = 4.5; // WCAG AA standard

    this.initializeDefaultPalettes();
    this.setupColorPanel();
  }

  initializeDefaultPalettes() {
    // Mathematical concept-based palettes
    this.palettes.set("default", {
      name: "Default",
      colors: [
        { h: 210, s: 80, l: 45, a: 1, label: "Variables" },
        { h: 150, s: 70, l: 35, a: 1, label: "Functions" },
        { h: 0, s: 75, l: 40, a: 1, label: "Constants" },
        { h: 270, s: 65, l: 45, a: 1, label: "Operators" },
      ],
    });

    this.palettes.set("contrast", {
      name: "High Contrast",
      colors: [
        { h: 210, s: 90, l: 35, a: 1, label: "Primary" },
        { h: 30, s: 85, l: 45, a: 1, label: "Secondary" },
        { h: 120, s: 80, l: 30, a: 1, label: "Tertiary" },
        { h: 0, s: 85, l: 40, a: 1, label: "Accent" },
      ],
    });

    this.palettes.set("pastel", {
      name: "Pastel",
      colors: [
        { h: 210, s: 50, l: 70, a: 1, label: "Soft Blue" },
        { h: 150, s: 45, l: 75, a: 1, label: "Soft Green" },
        { h: 0, s: 45, l: 75, a: 1, label: "Soft Red" },
        { h: 270, s: 40, l: 75, a: 1, label: "Soft Purple" },
      ],
    });
  }

  setupColorPanel() {
    const panel = document.createElement("div");
    panel.className = "color-management-panel";
    panel.innerHTML = this.createPanelHTML();
    document.body.appendChild(panel);

    this.panel = panel;
    this.setupEventListeners();
    this.renderPalettes();
    this.updateColorPreviews();
  }

  createPanelHTML() {
    return `
      <div class="color-panel-header">
        <h3>Color Management</h3>
        <div class="panel-actions">
          <button class="save-palette">Save</button>
          <button class="close-panel">×</button>
        </div>
      </div>
      
      <div class="color-panel-content">
        <div class="palette-selector">
          <label>Palette:</label>
          <select class="palette-select">
            ${Array.from(this.palettes.keys())
              .map(
                (key) =>
                  `<option value="${key}">${
                    this.palettes.get(key).name
                  }</option>`
              )
              .join("")}
          </select>
          <button class="new-palette">+ New</button>
        </div>

        <div class="color-controls">
          <div class="active-colors"></div>
          <div class="color-adjustments">
            <div class="adjustment-group">
              <label>Hue</label>
              <input type="range" class="hue-slider" min="0" max="360" step="1">
              <input type="number" class="hue-input" min="0" max="360">
            </div>
            <div class="adjustment-group">
              <label>Saturation</label>
              <input type="range" class="saturation-slider" min="0" max="100" step="1">
              <input type="number" class="saturation-input" min="0" max="100">
            </div>
            <div class="adjustment-group">
              <label>Lightness</label>
              <input type="range" class="lightness-slider" min="0" max="100" step="1">
              <input type="number" class="lightness-input" min="0" max="100">
            </div>
            <div class="adjustment-group">
              <label>Alpha</label>
              <input type="range" class="alpha-slider" min="0" max="100" step="1">
              <input type="number" class="alpha-input" min="0" max="100">
            </div>
          </div>
        </div>

        <div class="color-rules">
          <h4>Color Rules</h4>
          <div class="rule-list"></div>
          <button class="add-rule">Add Rule</button>
        </div>

        <div class="contrast-checker">
          <h4>Contrast Checker</h4>
          <div class="contrast-preview">
            <div class="contrast-sample">Sample Text</div>
            <div class="contrast-ratio">Ratio: <span>0</span></div>
          </div>
          <div class="contrast-warning hidden">
            Warning: Low contrast ratio
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Palette selection
    this.panel
      .querySelector(".palette-select")
      .addEventListener("change", (e) => {
        this.switchPalette(e.target.value);
      });

    // Color adjustment sliders
    const adjustments = ["hue", "saturation", "lightness", "alpha"];
    adjustments.forEach((type) => {
      const slider = this.panel.querySelector(`.${type}-slider`);
      const input = this.panel.querySelector(`.${type}-input`);

      slider.addEventListener("input", (e) => {
        this.updateColorValue(type, e.target.value);
        input.value = e.target.value;
      });

      input.addEventListener("change", (e) => {
        this.updateColorValue(type, e.target.value);
        slider.value = e.target.value;
      });
    });

    // New palette creation
    this.panel.querySelector(".new-palette").addEventListener("click", () => {
      this.createNewPalette();
    });

    // Save palette
    this.panel.querySelector(".save-palette").addEventListener("click", () => {
      this.savePalette();
    });

    // Rule management
    this.panel.querySelector(".add-rule").addEventListener("click", () => {
      this.addColorRule();
    });

    // Close panel
    this.panel.querySelector(".close-panel").addEventListener("click", () => {
      this.panel.classList.remove("visible");
    });
  }

  switchPalette(paletteId) {
    if (this.palettes.has(paletteId)) {
      this.currentPalette = paletteId;
      this.updateColorPreviews();
      this.checkContrast();
    }
  }

  updateColorValue(type, value) {
    const activeColor = this.getActiveColor();
    if (!activeColor) return;

    switch (type) {
      case "hue":
        activeColor.h = parseInt(value);
        break;
      case "saturation":
        activeColor.s = parseInt(value);
        break;
      case "lightness":
        activeColor.l = parseInt(value);
        break;
      case "alpha":
        activeColor.a = parseFloat(value) / 100;
        break;
    }

    this.updateColorPreviews();
    this.checkContrast();
  }

  getActiveColor() {
    const palette = this.palettes.get(this.currentPalette);
    return palette?.colors.find((c) => this.activeColors.has(c));
  }

  updateColorPreviews() {
    const colorsContainer = this.panel.querySelector(".active-colors");
    const palette = this.palettes.get(this.currentPalette);

    colorsContainer.innerHTML = palette.colors
      .map(
        (color) => `
      <div class="color-preview ${this.activeColors.has(color) ? "active" : ""}"
           style="background-color: ${this.hslaToString(color)}"
           data-label="${color.label}">
        <span class="color-label">${color.label}</span>
      </div>
    `
      )
      .join("");

    // Update sliders for active color
    const activeColor = this.getActiveColor();
    if (activeColor) {
      this.updateSliders(activeColor);
    }

    // Apply colors to formulas
    this.applyColorsToFormulas();
  }

  updateSliders(color) {
    const sliders = {
      hue: [color.h, ".hue-slider", ".hue-input"],
      saturation: [color.s, ".saturation-slider", ".saturation-input"],
      lightness: [color.l, ".lightness-slider", ".lightness-input"],
      alpha: [color.a * 100, ".alpha-slider", ".alpha-input"],
    };

    Object.entries(sliders).forEach(([_, [value, sliderClass, inputClass]]) => {
      const slider = this.panel.querySelector(sliderClass);
      const input = this.panel.querySelector(inputClass);
      slider.value = value;
      input.value = value;
    });
  }

  hslaToString(color) {
    return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
  }

  checkContrast() {
    const activeColor = this.getActiveColor();
    if (!activeColor) return;

    const backgroundColor = this.hslaToString(activeColor);
    const sample = this.panel.querySelector(".contrast-sample");
    const ratio = this.panel.querySelector(".contrast-ratio span");
    const warning = this.panel.querySelector(".contrast-warning");

    sample.style.color = backgroundColor;
    const contrastRatio = this.calculateContrastRatio(backgroundColor, "white");
    ratio.textContent = contrastRatio.toFixed(2);

    warning.classList.toggle("hidden", contrastRatio >= this.contrastThreshold);
  }

  calculateContrastRatio(color1, color2) {
    // Convert colors to relative luminance and calculate ratio
    const getLuminance = (color) => {
      // Implementation of relative luminance calculation
      // Based on WCAG 2.0 formula
      const rgb = this.colorToRGB(color);
      const [r, g, b] = rgb.map((val) => {
        val = val / 255;
        return val <= 0.03928
          ? val / 12.92
          : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  colorToRGB(color) {
    const temp = document.createElement("div");
    temp.style.color = color;
    document.body.appendChild(temp);
    const style = window.getComputedStyle(temp);
    const rgb = style.color.match(/\d+/g).map(Number);
    document.body.removeChild(temp);
    return rgb;
  }

  createNewPalette() {
    const name = prompt("Enter palette name:");
    if (!name) return;

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    this.palettes.set(id, {
      name,
      colors: [...this.palettes.get("default").colors.map((c) => ({ ...c }))],
    });

    this.updatePaletteSelector();
    this.switchPalette(id);
  }

  updatePaletteSelector() {
    const select = this.panel.querySelector(".palette-select");
    select.innerHTML = Array.from(this.palettes.keys())
      .map(
        (key) =>
          `<option value="${key}">${this.palettes.get(key).name}</option>`
      )
      .join("");
  }

  savePalette() {
    chrome.storage.sync.set(
      {
        colorPalettes: Array.from(this.palettes.entries()),
        currentPalette: this.currentPalette,
      },
      () => {
        this.showSaveConfirmation();
      }
    );
  }

  showSaveConfirmation() {
    const confirmation = document.createElement("div");
    confirmation.className = "save-confirmation";
    confirmation.textContent = "Palette saved!";
    this.panel.appendChild(confirmation);

    setTimeout(() => {
      confirmation.remove();
    }, 2000);
  }

  addColorRule() {
    const ruleList = this.panel.querySelector(".rule-list");
    const rule = document.createElement("div");
    rule.className = "color-rule";
    rule.innerHTML = `
      <select class="rule-type">
        <option value="section">Section</option>
        <option value="variable">Variable</option>
        <option value="formula">Formula Type</option>
      </select>
      <input type="text" class="rule-pattern" placeholder="Pattern...">
      <div class="rule-color" style="background-color: ${this.hslaToString(
        this.getActiveColor()
      )}"></div>
      <button class="remove-rule">×</button>
    `;

    ruleList.appendChild(rule);
    this.setupRuleListeners(rule);
  }

  setupRuleListeners(rule) {
    rule.querySelector(".remove-rule").addEventListener("click", () => {
      rule.remove();
    });

    rule.querySelector(".rule-color").addEventListener("click", () => {
      // Show color picker for rule
    });
  }

  applyColorsToFormulas() {
    // Apply colors based on rules and active palette
    document.querySelectorAll("[data-math-enhanced]").forEach((formula) => {
      const rules = this.getApplicableRules(formula);
      if (rules.length > 0) {
        const color = this.resolveColorFromRules(rules);
        formula.style.color = this.hslaToString(color);
      }
    });
  }

  getApplicableRules(formula) {
    // Implementation of rule matching logic
    return [];
  }

  resolveColorFromRules(rules) {
    // Implementation of color resolution from rules
    return this.palettes.get(this.currentPalette).colors[0];
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.colorManager = new ColorManager();
});
