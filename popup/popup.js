document.addEventListener("DOMContentLoaded", () => {
  // Initialize UI elements
  const ui = {
    // Mode buttons
    modeButtons: document.querySelectorAll(".mode-btn"),
    variableSection: document.getElementById("variable-section"),
    equationSection: document.getElementById("equation-section"),

    // Variable controls
    xColor: document.getElementById("xColor"),
    yColor: document.getElementById("yColor"),
    betaColor: document.getElementById("betaColor"),
    epsilonColor: document.getElementById("epsilonColor"),
    detectedVarList: document.getElementById("detectedVarList"),
    newVarName: document.getElementById("newVarName"),
    newVarColor: document.getElementById("newVarColor"),
    addVarBtn: document.getElementById("addVarBtn"),

    // Equation controls
    equationList: document.getElementById("equationList"),
    eqBgColor: document.getElementById("eqBgColor"),
    eqBorderStyle: document.getElementById("eqBorderStyle"),
    eqBorderColor: document.getElementById("eqBorderColor"),

    // Color management
    presetButtons: document.querySelectorAll(".preset-btn"),
    savedPaletteSelect: document.getElementById("savedPaletteSelect"),
    savePaletteBtn: document.getElementById("savePaletteBtn"),
    deletePaletteBtn: document.getElementById("deletePaletteBtn"),

    // Action buttons
    resetBtn: document.getElementById("resetBtn"),
    applyBtn: document.getElementById("applyBtn"),
    status: document.getElementById("status"),
  };

  // State management
  const state = {
    mode: "variable",
    selectedVariables: new Set(),
    selectedEquations: new Set(),
    currentPalette: null,
    detectedVariables: [],
    equations: [],
  };

  // Mode switching
  ui.modeButtons.forEach((button) => {
    button?.addEventListener("click", () => {
      const mode = button.dataset.mode;
      state.mode = mode;

      // Update UI
      ui.modeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Show/hide sections
      ui.variableSection.style.display = mode === "variable" ? "block" : "none";
      ui.equationSection.style.display = mode === "equation" ? "block" : "none";
    });
  });

  // Variable color handling
  const defaultColors = {
    x: ui.xColor?.value || "#FF4444",
    y: ui.yColor?.value || "#44FF44",
    β: ui.betaColor?.value || "#4444FF",
    ε: ui.epsilonColor?.value || "#FF44FF",
  };

  [ui.xColor, ui.yColor, ui.betaColor, ui.epsilonColor].forEach(
    (colorInput) => {
      colorInput?.addEventListener("change", (e) => {
        const variable = e.target.id.replace("Color", "");
        updateVariableColor(variable, e.target.value);
      });
    }
  );

  // Custom variable handling
  ui.addVarBtn?.addEventListener("click", () => {
    const name = ui.newVarName?.value.trim();
    const color = ui.newVarColor?.value;

    if (name) {
      addCustomVariable(name, color);
      ui.newVarName.value = "";
    }
  });

  // Color preset handling
  ui.presetButtons.forEach((button) => {
    button?.addEventListener("click", () => {
      const palette = button.dataset.palette;
      applyColorPalette(palette);
    });
  });

  // Save/load palettes
  ui.savePaletteBtn?.addEventListener("click", () => {
    savePalette();
  });

  ui.deletePaletteBtn?.addEventListener("click", () => {
    deletePalette();
  });

  // Apply changes
  ui.applyBtn?.addEventListener("click", () => {
    applyChanges();
  });

  // Reset
  ui.resetBtn?.addEventListener("click", () => {
    resetAll();
  });

  // Helper functions
  function updateVariableColor(variable, color) {
    // Update color in state
    if (state.mode === "variable") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;

        chrome.tabs.sendMessage(tabs[0].id, {
          type: "updateVariableColor",
          variable: variable,
          color: color,
        });
      });
    }
  }

  function addCustomVariable(name, color) {
    const varItem = document.createElement("div");
    varItem.className = "variable-list-item";
    varItem.innerHTML = `
      <span class="variable-preview">${name}</span>
      <input type="color" value="${color}" />
      <button class="remove-var">×</button>
    `;

    ui.detectedVarList?.appendChild(varItem);

    // Add event listeners
    const colorInput = varItem.querySelector('input[type="color"]');
    const removeBtn = varItem.querySelector(".remove-var");

    colorInput?.addEventListener("change", (e) => {
      updateVariableColor(name, e.target.value);
    });

    removeBtn?.addEventListener("click", () => {
      varItem.remove();
    });
  }

  function applyColorPalette(palette) {
    const palettes = {
      default: defaultColors,
      contrast: {
        x: "#FF0000",
        y: "#00FF00",
        β: "#0000FF",
        ε: "#FF00FF",
      },
      colorblind: {
        x: "#E69F00",
        y: "#56B4E9",
        β: "#009E73",
        ε: "#F0E442",
      },
      pastel: {
        x: "#FFB3B3",
        y: "#B3FFB3",
        β: "#B3B3FF",
        ε: "#FFB3FF",
      },
    };

    const colors = palettes[palette] || palettes.default;

    // Update color inputs
    if (ui.xColor) ui.xColor.value = colors.x;
    if (ui.yColor) ui.yColor.value = colors.y;
    if (ui.betaColor) ui.betaColor.value = colors.β;
    if (ui.epsilonColor) ui.epsilonColor.value = colors.ε;

    // Apply colors
    Object.entries(colors).forEach(([variable, color]) => {
      updateVariableColor(variable, color);
    });
  }

  function savePalette() {
    const name = prompt("Enter palette name:");
    if (!name) return;

    const palette = {
      name,
      colors: {
        x: ui.xColor?.value,
        y: ui.yColor?.value,
        β: ui.betaColor?.value,
        ε: ui.epsilonColor?.value,
      },
    };

    chrome.storage.sync.get(["savedPalettes"], (data) => {
      const palettes = data.savedPalettes || [];
      palettes.push(palette);
      chrome.storage.sync.set({ savedPalettes: palettes }, () => {
        showStatus("Palette saved!");
        updatePaletteList();
      });
    });
  }

  function deletePalette() {
    const select = ui.savedPaletteSelect;
    if (!select?.value) return;

    chrome.storage.sync.get(["savedPalettes"], (data) => {
      const palettes = data.savedPalettes || [];
      const newPalettes = palettes.filter((p) => p.name !== select.value);
      chrome.storage.sync.set({ savedPalettes: newPalettes }, () => {
        showStatus("Palette deleted!");
        updatePaletteList();
      });
    });
  }

  function updatePaletteList() {
    const select = ui.savedPaletteSelect;
    if (!select) return;

    chrome.storage.sync.get(["savedPalettes"], (data) => {
      const palettes = data.savedPalettes || [];
      select.innerHTML =
        '<option value="">Select a saved palette...</option>' +
        palettes
          .map((p) => `<option value="${p.name}">${p.name}</option>`)
          .join("");
    });
  }

  function applyChanges() {
    const settings = {
      mode: state.mode,
      variables: {
        x: ui.xColor?.value,
        y: ui.yColor?.value,
        β: ui.betaColor?.value,
        ε: ui.epsilonColor?.value,
      },
      equations: {
        backgroundColor: ui.eqBgColor?.value,
        borderStyle: ui.eqBorderStyle?.value,
        borderColor: ui.eqBorderColor?.value,
      },
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "applySettings",
          settings: settings,
        },
        () => {
          showStatus("Changes applied!");
        }
      );
    });
  }

  function resetAll() {
    // Reset colors to defaults
    applyColorPalette("default");

    // Reset equation styles
    if (ui.eqBgColor) ui.eqBgColor.value = "#F0F0F0";
    if (ui.eqBorderStyle) ui.eqBorderStyle.value = "none";
    if (ui.eqBorderColor) ui.eqBorderColor.value = "#CCCCCC";

    showStatus("Settings reset!");
  }

  function showStatus(message) {
    if (!ui.status) return;

    ui.status.textContent = message;
    ui.status.style.opacity = "1";

    setTimeout(() => {
      ui.status.style.opacity = "0";
    }, 2000);
  }

  // Initialize
  updatePaletteList();
  applyColorPalette("default");

  // Load current page data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    chrome.tabs.sendMessage(tabs[0].id, { type: "getPageData" }, (response) => {
      if (response?.variables) {
        state.detectedVariables = response.variables;
        response.variables.forEach((v) => {
          if (!defaultColors[v]) {
            addCustomVariable(v, "#000000");
          }
        });
      }

      if (response?.equations) {
        state.equations = response.equations;
        updateEquationList(response.equations);
      }
    });
  });

  function updateEquationList(equations) {
    if (!ui.equationList) return;

    ui.equationList.innerHTML = equations
      .map(
        (eq, index) => `
      <div class="equation-item" data-index="${index}">
        <div class="equation-preview">${eq.latex}</div>
      </div>
    `
      )
      .join("");

    // Add click handlers
    document.querySelectorAll(".equation-item").forEach((item) => {
      item.addEventListener("click", () => {
        item.classList.toggle("selected");
        const index = parseInt(item.dataset.index);
        if (item.classList.contains("selected")) {
          state.selectedEquations.add(index);
        } else {
          state.selectedEquations.delete(index);
        }
      });
    });
  }
});
