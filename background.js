// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "colorLatex",
    title: "Color LaTeX",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "colorLatex") {
    chrome.tabs.sendMessage(tab.id, {
      action: "colorSelection",
      text: info.selectionText,
    });
  }
});
