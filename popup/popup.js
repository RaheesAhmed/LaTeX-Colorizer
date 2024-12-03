// Popup script for LaTeX Formula Colorizer

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const autoHighlightCheckbox = document.getElementById("autoHighlight");
  const showTooltipsCheckbox = document.getElementById("showTooltips");
  const darkModeCheckbox = document.getElementById("darkMode");
  const performanceModeCheckbox = document.getElementById("performanceMode");
  const clearButton = document.getElementById("clearHighlights");
  const resetButton = document.getElementById("resetSettings");
  const saveButton = document.getElementById("saveSettings");

  // Performance metric elements
  const fpsValue = document.getElementById("fpsValue");
  const renderTimeValue = document.getElementById("renderTimeValue");
  const memoryValue = document.getElementById("memoryValue");
  const cacheValue = document.getElementById("cacheValue");

  // Load current settings
  chrome.storage.sync.get(
    ["autoHighlight", "showTooltips", "darkMode", "performanceMode"],
    (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        return;
      }

      try {
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
        if (performanceModeCheckbox) {
          performanceModeCheckbox.checked = data.performanceMode ?? false;
        }
      } catch (error) {
        console.error("Error applying settings:", error);
      }
    }
  );

  // Function to update theme
  function updateTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
  }

  // Function to notify content script of settings changes
  function notifyContentScript(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.warn("No active tab found");
        return;
      }

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
          } else if (response?.error) {
            updateStatus(`Error: ${response.error}`);
          }
        }
      );
    });
  }

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

  if (performanceModeCheckbox) {
    performanceModeCheckbox.addEventListener("change", (e) => {
      const settings = { performanceMode: e.target.checked };
      chrome.storage.sync.set(settings);
      notifyContentScript(settings);
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      notifyContentScript({ type: "clearHighlights" });
      updateStatus("Cleared all highlights");
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      notifyContentScript({ type: "resetSettings" });
      updateStatus("Reset to default settings");
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const settings = {
        autoHighlight: autoHighlightCheckbox?.checked ?? true,
        showTooltips: showTooltipsCheckbox?.checked ?? true,
        darkMode: darkModeCheckbox?.checked ?? false,
        performanceMode: performanceModeCheckbox?.checked ?? false,
      };
      chrome.storage.sync.set(settings);
      notifyContentScript({ type: "settingsChanged", settings });
      updateStatus("Settings saved successfully");
    });
  }

  // Update performance metrics
  function updatePerformanceMetrics() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: "getState" }, (response) => {
        if (chrome.runtime.lastError || !response?.success) return;

        const performance = response.state.performance;
        if (performance) {
          if (fpsValue) fpsValue.textContent = performance.fps;
          if (renderTimeValue)
            renderTimeValue.textContent = performance.averageRenderTime;
          if (memoryValue) memoryValue.textContent = performance.memoryTrend;
          if (cacheValue)
            cacheValue.textContent =
              performance.cacheStats.formulaCache +
              performance.cacheStats.colorCache;
        }
      });
    });
  }

  // Update performance metrics every second
  setInterval(updatePerformanceMetrics, 1000);

  function updateStatus(message) {
    const status = document.createElement("div");
    status.className = "status-message";
    status.textContent = message;
    document.body.appendChild(status);

    setTimeout(() => {
      status.classList.add("fade-out");
      setTimeout(() => status.remove(), 500);
    }, 2000);
  }
});
