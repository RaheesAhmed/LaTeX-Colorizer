// Content script for Wikipedia Math Formula Enhancer

class WikiMathEnhancer {
  constructor() {
    this.mathElements = [];
  }

  init() {
    this.findMathElements();
    this.enhanceFormulas();
  }

  findMathElements() {
    // Find all math elements in Wikipedia page
    this.mathElements = [
      ...document.querySelectorAll(".mwe-math-element"),
      ...document.querySelectorAll(".mwe-math-fallback-image-inline"),
      ...document.querySelectorAll(".tex"),
    ];
  }

  enhanceFormulas() {
    this.mathElements.forEach((element) => {
      try {
        const texContent = element.getAttribute("alt") || element.textContent;
        if (texContent) {
          const renderedMath = katex.renderToString(texContent, {
            throwOnError: false,
            displayMode: !element.classList.contains(
              "mwe-math-fallback-image-inline"
            ),
          });
          element.innerHTML = renderedMath;
        }
      } catch (error) {
        console.warn("Error rendering formula:", error);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const enhancer = new WikiMathEnhancer();
  enhancer.init();
});
