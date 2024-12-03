// Background service worker for Wikipedia Math Formula Enhancer

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      autoRender: true,
      displayMode: "block",
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getSettings") {
    chrome.storage.sync.get(
      ["enabled", "autoRender", "displayMode"],
      (data) => {
        sendResponse(data);
      }
    );
    return true; // Will respond asynchronously
  }
});
