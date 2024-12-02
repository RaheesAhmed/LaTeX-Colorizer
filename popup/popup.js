// Popup script for Wikipedia Math Formula Enhancer

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const enabledCheckbox = document.getElementById("enabled");
  const autoRenderCheckbox = document.getElementById("autoRender");
  const displayModeSelect = document.getElementById("displayMode");
  const statusMessage = document.getElementById("status-message");

  // Load current settings
  chrome.storage.sync.get(["enabled", "autoRender", "displayMode"], (data) => {
    enabledCheckbox.checked = data.enabled ?? true;
    autoRenderCheckbox.checked = data.autoRender ?? true;
    displayModeSelect.value = data.displayMode ?? "block";
  });

  // Save settings when changed
  enabledCheckbox.addEventListener("change", (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
    updateStatus("Settings saved");
  });

  autoRenderCheckbox.addEventListener("change", (e) => {
    chrome.storage.sync.set({ autoRender: e.target.checked });
    updateStatus("Settings saved");
  });

  displayModeSelect.addEventListener("change", (e) => {
    chrome.storage.sync.set({ displayMode: e.target.value });
    updateStatus("Settings saved");
  });

  function updateStatus(message) {
    statusMessage.textContent = message;
    setTimeout(() => {
      statusMessage.textContent = "Ready to enhance math formulas";
    }, 2000);
  }
});
