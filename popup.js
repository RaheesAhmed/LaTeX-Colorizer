// Default colors
const DEFAULT_COLORS = {
  x: "#FF0000", // Red
  y: "#00FF00", // Green
  beta: "#0000FF", // Blue
  epsilon: "#800080", // Purple
};

// DOM elements
const colorInputs = {
  x: document.getElementById("xColor"),
  y: document.getElementById("yColor"),
  beta: document.getElementById("betaColor"),
  epsilon: document.getElementById("epsilonColor"),
};
const applyButton = document.getElementById("applyButton");
const statusElement = document.getElementById("status");

let customVariables = {};

document.addEventListener("DOMContentLoaded", async () => {
  // Load saved colors and custom variables
  const result = await chrome.storage.local.get(["colors", "customVariables"]);
  const colors = result.colors || {
    x: "#FF0000",
    y: "#00FF00",
    beta: "#0000FF",
    epsilon: "#800080",
  };
  customVariables = result.customVariables || {};

  // Set up default color inputs
  document.getElementById("xColor").value = colors.x;
  document.getElementById("yColor").value = colors.y;
  document.getElementById("betaColor").value = colors.beta;
  document.getElementById("epsilonColor").value = colors.epsilon;

  // Load custom variables
  renderCustomVariables();

  // Set up color change listeners
  setupColorChangeListeners();
});

function setupColorChangeListeners() {
  const colorInputs = ["xColor", "yColor", "betaColor", "epsilonColor"];

  colorInputs.forEach((id) => {
    document.getElementById(id).addEventListener("change", updateColors);
  });

  // Add custom variable button
  document
    .getElementById("addVariable")
    .addEventListener("click", addCustomVariable);
}

function addCustomVariable() {
  const varName = document.getElementById("newVariable").value.trim();
  const color = document.getElementById("newColor").value;

  if (varName) {
    customVariables[varName] = color;
    saveAndUpdate();
    renderCustomVariables();
    document.getElementById("newVariable").value = "";
  }
}

function renderCustomVariables() {
  const container = document.getElementById("customVariables");
  container.innerHTML = "";

  Object.entries(customVariables).forEach(([variable, color]) => {
    const div = document.createElement("div");
    div.className = "variable-group";
    div.innerHTML = `
      <span class="variable-name">${variable}:</span>
      <input type="color" value="${color}" data-variable="${variable}" />
      <span class="delete-btn" data-variable="${variable}">×</span>
    `;

    div.querySelector('input[type="color"]').addEventListener("change", (e) => {
      customVariables[variable] = e.target.value;
      saveAndUpdate();
    });

    div.querySelector(".delete-btn").addEventListener("click", () => {
      delete customVariables[variable];
      saveAndUpdate();
      renderCustomVariables();
    });

    container.appendChild(div);
  });
}

async function updateColors() {
  const colors = {
    x: document.getElementById("xColor").value,
    y: document.getElementById("yColor").value,
    beta: document.getElementById("betaColor").value,
    epsilon: document.getElementById("epsilonColor").value,
  };

  await saveAndUpdate(colors);
}

async function saveAndUpdate(colors = null) {
  const colorData = colors || {
    x: document.getElementById("xColor").value,
    y: document.getElementById("yColor").value,
    beta: document.getElementById("betaColor").value,
    epsilon: document.getElementById("epsilonColor").value,
  };

  await chrome.storage.local.set({
    colors: colorData,
    customVariables: customVariables,
  });

  // Send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "updateColors",
      colors: colorData,
      customVariables: customVariables,
    });
  }
}

// Show status message
function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#dc3545" : "#28a745";
  setTimeout(() => {
    statusElement.textContent = "";
  }, 3000);
}

// Apply colors to the active tab
async function applyColors() {
  try {
    const colors = getCurrentColors();

    // Save colors to storage
    await chrome.storage.local.set({ colors });

    // Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      throw new Error("No active tab found");
    }

    // Send colors to content script
    await chrome.tabs.sendMessage(tab.id, {
      action: "updateColors",
      colors: colors,
    });

    showStatus("Colors applied successfully!");
  } catch (error) {
    console.error("Error applying colors:", error);
    showStatus("Error applying colors", true);
  }
}

// Event Listeners
applyButton.addEventListener("click", applyColors);

// Real-time preview
Object.values(colorInputs).forEach((input) => {
  input.addEventListener("input", applyColors);
});
