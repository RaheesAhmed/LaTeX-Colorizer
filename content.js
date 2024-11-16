// Add KaTeX CSS and custom styles
const cssFiles = ["lib/katex.min.css", "styles/content.css"];

// Load CSS files
cssFiles.forEach((file) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL(file);
  document.head.appendChild(link);
});

// Store current color configuration
let currentColors = {
  x: "#FF0000",
  y: "#00FF00",
  beta: "#0000FF",
  epsilon: "#800080",
};

// Load saved colors on startup with error handling
try {
  chrome.storage.local.get("colors", (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading colors:", chrome.runtime.lastError);
      return;
    }
    if (result && result.colors) {
      currentColors = result.colors;
    }
  });
} catch (error) {
  console.error("Failed to access storage:", error);
}

// Add storage for custom variables
let currentCustomVariables = {};

// Load saved custom variables on startup
try {
  chrome.storage.local.get(["customVariables"], (result) => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error loading custom variables:",
        chrome.runtime.lastError
      );
      return;
    }
    if (result && result.customVariables) {
      currentCustomVariables = result.customVariables;
    }
  });
} catch (error) {
  console.error("Failed to access storage:", error);
}

// Main function to find and process LaTeX elements
async function processLatexElements() {
  try {
    console.log("🔍 Searching for LaTeX elements...");

    // Find all LaTeX elements on Wikipedia
    const latexElements = Array.from(
      document.querySelectorAll(
        ".mwe-math-element, .mwe-math-mathml-inline, .mwe-math-mathml-display"
      )
    ).filter((el) => {
      return (
        !el.hasAttribute("data-latex-processed") &&
        !el.querySelector(".latex-processed") &&
        el.textContent.trim().length > 0
      );
    });

    console.log(`📊 Found ${latexElements.length} LaTeX elements`);

    // Process each element
    for (const element of latexElements) {
      await processElement(element);
    }
  } catch (error) {
    console.error("❌ Error processing LaTeX elements:", error);
  }
}

// Process individual LaTeX element
async function processElement(element) {
  try {
    let latexSource = extractLatexSource(element);
    if (!latexSource) return;

    latexSource = cleanLatexSource(latexSource);

    // Add validation for LaTeX source
    if (!isValidLatex(latexSource)) {
      console.warn("Invalid LaTeX source:", latexSource);
      return;
    }

    const colorizedLatex = await colorizeLatex(latexSource);
    await insertColoredVersion(element, colorizedLatex);
  } catch (error) {
    console.error("Process error:", error, element);
  }
}

// Extract LaTeX source from element
function extractLatexSource(element) {
  // Try different methods to get LaTeX source
  if (element.hasAttribute("alttext")) {
    return element.getAttribute("alttext");
  }

  const annotation = element.querySelector(
    'annotation[encoding="application/x-tex"]'
  );
  if (annotation) {
    return annotation.textContent;
  }

  const math = element.querySelector("math");
  if (math && math.getAttribute("alttext")) {
    return math.getAttribute("alttext");
  }

  return element.textContent;
}

// Clean LaTeX source
function cleanLatexSource(source) {
  return source
    .replace(/\\begin{align\*?}/g, "")
    .replace(/\\end{align\*?}/g, "")
    .replace(/\\begin{equation\*?}/g, "")
    .replace(/\\end{equation\*?}/g, "")
    .trim();
}

// Colorize LaTeX content
async function colorizeLatex(source) {
  try {
    let colorized = source;

    // Safer regex patterns for variable detection with proper KaTeX color syntax
    const variableMappings = {
      // x variables with subscripts - using direct color command
      "(?<!\\\\)x(?![a-zA-Z])": `\\textcolor{${currentColors.x}}{x}`,
      "x_[{]?\\d+[}]?": (match) => `\\textcolor{${currentColors.x}}{${match}}`,
      "x_[{]?[a-z][}]?": (match) => `\\textcolor{${currentColors.x}}{${match}}`,

      // y variables with subscripts
      "(?<!\\\\)y(?![a-zA-Z])": `\\textcolor{${currentColors.y}}{y}`,
      "y_[{]?\\d+[}]?": (match) => `\\textcolor{${currentColors.y}}{${match}}`,
      "y_[{]?[a-z][}]?": (match) => `\\textcolor{${currentColors.y}}{${match}}`,

      // Greek letters
      "\\\\beta(?![a-zA-Z])": `\\textcolor{${currentColors.beta}}{\\beta}`,
      "\\\\epsilon(?![a-zA-Z])": `\\textcolor{${currentColors.epsilon}}{\\epsilon}`,
    };

    // Add custom variables with safer patterns
    if (currentCustomVariables) {
      Object.entries(currentCustomVariables).forEach(([variable, color]) => {
        const escapedVar = variable.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        variableMappings[
          `(?<!\\\\)${escapedVar}(?![a-zA-Z])`
        ] = `\\textcolor{${color}}{${variable}}`;
      });
    }

    // Apply colorization with safer regex
    Object.entries(variableMappings).forEach(([pattern, replacement]) => {
      const regex = new RegExp(pattern, "g");
      if (typeof replacement === "function") {
        colorized = colorized.replace(regex, replacement);
      } else {
        colorized = colorized.replace(regex, replacement);
      }
    });

    // Don't wrap the entire expression in a group
    return colorized;
  } catch (error) {
    console.error("Colorize error:", error);
    return source;
  }
}

// Insert colored version into page
async function insertColoredVersion(element, colorizedLatex) {
  const coloredElement = document.createElement("span");
  coloredElement.className = "latex-processed";
  coloredElement.style.display = element.style.display || "inline-block";

  const isDisplayMode =
    element.classList.contains("mwe-math-mathml-display") ||
    colorizedLatex.includes("\\displaystyle");

  try {
    await renderWithKaTeX(coloredElement, colorizedLatex, isDisplayMode);
    element.parentNode.insertBefore(coloredElement, element.nextSibling);
    element.style.display = "none";
    element.setAttribute("data-latex-processed", "true");
  } catch (error) {
    console.error("Render error:", error);
    coloredElement.remove();
  }
}

// Render using KaTeX
async function renderWithKaTeX(element, latex, isDisplayMode) {
  return new Promise((resolve, reject) => {
    try {
      katex.render(latex, element, {
        throwOnError: false,
        errorColor: "#cc0000",
        displayMode: isDisplayMode,
        output: "html",
        trust: true,
        strict: "ignore", // Changed from false to "ignore"
        macros: {
          "\\epsilon": "\\varepsilon",
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          // Add color command alias
          "\\textcolor": "\\color",
        },
        minRuleThickness: 0.05,
        maxSize: 100,
        maxExpand: 1000,
      });
      resolve();
    } catch (error) {
      console.error("KaTeX render error:", error);
      // Fallback rendering without colors
      try {
        const strippedLatex = latex.replace(/\\textcolor{.*?}{(.*?)}/g, "$1");
        katex.render(strippedLatex, element, {
          throwOnError: false,
          errorColor: "#cc0000",
          displayMode: isDisplayMode,
          strict: "ignore",
        });
        resolve();
      } catch (fallbackError) {
        reject(fallbackError);
      }
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Received message:", message);

  if (message.action === "updateColors") {
    console.log("🎨 Updating colors to:", message.colors);
    currentColors = message.colors;
    currentCustomVariables = message.customVariables;
    processLatexElements()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Initialize processing with debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Debounced process function
const debouncedProcess = debounce(processLatexElements, 250);

// Process on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", debouncedProcess);
} else {
  debouncedProcess();
}

// Watch for dynamic content changes
const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
    console.log("➕ New nodes added, reprocessing...");
    debouncedProcess();
  }
});

// Start observing with delay to avoid initial load conflicts
setTimeout(() => {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}, 1000);

// Function to handle text selection
function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText) {
    // Check if selection contains LaTeX
    const isLatex = isLatexContent(selectedText);

    // Create floating menu
    showFloatingMenu(selection, isLatex);
  }
}

// Function to check if content is LaTeX
function isLatexContent(text) {
  const latexPatterns = [
    /\\\w+/, // Commands
    /\$.*?\$/, // Inline math
    /\\begin\{.*?\}/, // Environments
    /[_^]{.*?}/, // Subscripts/superscripts
  ];

  return latexPatterns.some((pattern) => pattern.test(text));
}

// Create floating menu for selection
function showFloatingMenu(selection, isLatex) {
  // Remove existing floating menu
  const existingMenu = document.getElementById("latex-floating-menu");
  if (existingMenu) existingMenu.remove();

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "latex-floating-menu";
  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + window.scrollY + 10}px`;
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.zIndex = "10000";

  // Add menu options based on content type
  if (isLatex) {
    menu.innerHTML = `
      <button class="menu-button" data-action="colorize">Colorize Variables</button>
      <button class="menu-button" data-action="highlight">Highlight Expression</button>
      <button class="menu-button" data-action="annotate">Add Annotation</button>
    `;
  } else {
    menu.innerHTML = `
      <button class="menu-button" data-action="highlight">Highlight Text</button>
      <button class="menu-button" data-action="link-latex">Link to LaTeX</button>
    `;
  }

  document.body.appendChild(menu);

  // Add event listeners to menu buttons
  menu.querySelectorAll(".menu-button").forEach((button) => {
    button.addEventListener("click", (e) => handleMenuAction(e, selection));
  });
}

// Handle menu actions
async function handleMenuAction(event, selection) {
  const action = event.target.dataset.action;
  const selectedText = selection.toString().trim();

  switch (action) {
    case "colorize":
      await colorizeSelection(selection);
      break;
    case "highlight":
      highlightSelection(selection);
      break;
    case "annotate":
      addAnnotation(selection);
      break;
    case "link-latex":
      linkToLatex(selection);
      break;
  }

  // Remove floating menu
  document.getElementById("latex-floating-menu")?.remove();
}

// Function to colorize selected LaTeX
async function colorizeSelection(selection) {
  const range = selection.getRangeAt(0);
  const element = range.commonAncestorContainer.parentElement;

  if (element.classList.contains("mwe-math-element")) {
    const latexSource = extractLatexSource(element);
    const colorizedLatex = await colorizeLatex(latexSource);
    await insertColoredVersion(element, colorizedLatex);
  }
}

// Function to highlight selection
function highlightSelection(selection) {
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.className = "latex-highlight";
  span.style.backgroundColor = currentColors.highlight || "#ffeb3b";

  range.surroundContents(span);
}

// Function to add annotation
function addAnnotation(selection) {
  const range = selection.getRangeAt(0);
  const annotation = prompt("Enter annotation:");

  if (annotation) {
    const span = document.createElement("span");
    span.className = "latex-annotation";
    span.setAttribute("data-annotation", annotation);
    span.title = annotation;

    range.surroundContents(span);
  }
}

// Function to link text to LaTeX
function linkToLatex(selection) {
  const range = selection.getRangeAt(0);
  const latexRef = prompt("Enter LaTeX expression to link to:");

  if (latexRef) {
    const span = document.createElement("span");
    span.className = "latex-reference";
    span.setAttribute("data-latex", latexRef);
    span.title = latexRef;

    range.surroundContents(span);
  }
}

// Add event listener for text selection
document.addEventListener("mouseup", handleTextSelection);

// Add styles for new elements
const style = document.createElement("style");
style.textContent = `
  .latex-highlight {
    background-color: #ffeb3b;
    cursor: pointer;
  }
  
  .latex-annotation {
    border-bottom: 2px dotted #2196f3;
    cursor: help;
  }
  
  .latex-reference {
    border-bottom: 2px solid #4caf50;
    cursor: pointer;
  }
  
  #latex-floating-menu {
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    padding: 5px;
  }
  
  .menu-button {
    display: block;
    width: 100%;
    padding: 5px 10px;
    margin: 2px 0;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
  }
  
  .menu-button:hover {
    background: #f0f0f0;
  }
`;

document.head.appendChild(style);

// Add a helper function to validate LaTeX
function isValidLatex(latex) {
  // Basic validation to check for balanced braces and common issues
  let braceCount = 0;
  for (let char of latex) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (braceCount < 0) return false;
  }
  return braceCount === 0;
}
