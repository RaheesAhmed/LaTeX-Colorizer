// Popup script for LaTeX Formula Colorizer

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const autoHighlightCheckbox = document.getElementById("autoHighlight");
  const showTooltipsCheckbox = document.getElementById("showTooltips");
  const darkModeCheckbox = document.getElementById("darkMode");
  const clearButton = document.getElementById("clearHighlights");
  const applyButton = document.getElementById("applyHighlights");
  const statusText = document.querySelector(".status-text");

  // Load current settings
  chrome.storage.sync.get(
    ["autoHighlight", "showTooltips", "darkMode"],
    (data) => {
      if (autoHighlightCheckbox) {
        autoHighlightCheckbox.checked = data.autoHighlight ?? true;
      }
      if (showTooltipsCheckbox) {
        showTooltipsCheckbox.checked = data.showTooltips ?? true;
      }
      if (darkModeCheckbox) {
        darkModeCheckbox.checked = data.darkMode ?? false;
        updateTheme(data.darkMode ?? false);
      }
    }
  );

  // Function to update theme
  function updateTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
  }

  // Function to notify content script of settings changes
  const notifyContentScript = (settings) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: "settingsChanged",
            settings: settings,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Error sending message:", chrome.runtime.lastError);
              updateStatus("Error applying settings");
              return;
            }
            if (response?.success) {
              updateStatus("Settings applied successfully");
            }
          }
        );
      }
    });
  };

  // Event listeners with null checks
  if (autoHighlightCheckbox) {
    autoHighlightCheckbox.addEventListener("change", (e) => {
      const settings = { autoHighlight: e.target.checked };
      chrome.storage.sync.set(settings);
      notifyContentScript(settings);
    });
  }

  if (showTooltipsCheckbox) {
    showTooltipsCheckbox.addEventListener("change", (e) => {
      const settings = { showTooltips: e.target.checked };
      chrome.storage.sync.set(settings);
      notifyContentScript(settings);
    });
  }

  if (darkModeCheckbox) {
    darkModeCheckbox.addEventListener("change", (e) => {
      const isDark = e.target.checked;
      const settings = { darkMode: isDark };
      chrome.storage.sync.set(settings);
      updateTheme(isDark);
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      notifyContentScript({ action: "clearHighlights" });
      updateStatus("Cleared all highlights");
    });
  }

  if (applyButton) {
    applyButton.addEventListener("click", () => {
      notifyContentScript({ action: "applyHighlights" });
      updateStatus("Applying highlights...");
    });
  }

  function updateStatus(message) {
    if (statusText) {
      statusText.textContent = message;
      setTimeout(() => {
        statusText.textContent = "Extension is active";
      }, 2000);
    }
  }

  // Initialize status indicator animation
  const statusIndicator = document.querySelector(".status-indicator");
  if (statusIndicator) {
    setInterval(() => {
      statusIndicator.style.opacity = "0.5";
      setTimeout(() => {
        statusIndicator.style.opacity = "1";
      }, 1000);
    }, 2000);
  }
});
