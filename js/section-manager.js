// Section-based control system for formula enhancement
class SectionManager {
  constructor() {
    this.sections = new Map();
    this.selectedSections = new Set();
    this.rules = new Map();
    this.observer = null;
    this.dragState = {
      active: false,
      startSection: null,
      lastSection: null,
    };
  }

  async init() {
    await this.loadSectionHierarchy();
    this.createControlPanel();
    this.setupEventListeners();
    this.initMutationObserver();
    await this.loadPersistedState();
  }

  async loadSectionHierarchy() {
    try {
      // Get page title from Wikipedia
      const pageTitle =
        document.querySelector("#firstHeading")?.textContent || "";
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodeURIComponent(
        pageTitle
      )}&prop=sections&origin=*`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.parse && data.parse.sections) {
        this.processSectionData(data.parse.sections);
      }

      // Also process sections from DOM for immediate access
      this.processCurrentDOM();
    } catch (error) {
      console.warn("Error loading section hierarchy:", error);
      // Fallback to DOM-only processing
      this.processCurrentDOM();
    }
  }

  processSectionData(apiSections) {
    apiSections.forEach((section) => {
      this.sections.set(section.anchor, {
        id: section.anchor,
        title: section.line,
        level: section.level,
        index: section.index,
        parent: this.findParentSection(section.level),
        children: [],
        formulas: new Set(),
        enabled: true,
      });
    });
  }

  processCurrentDOM() {
    const sectionElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let currentLevel = 1;
    let lastSection = null;

    sectionElements.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      const id = heading.id || this.generateSectionId(heading.textContent);

      const section = {
        id,
        title: heading.textContent,
        level,
        element: heading,
        parent: this.findParentSection(level),
        children: [],
        formulas: this.findFormulasInSection(heading),
        enabled: true,
      };

      this.sections.set(id, section);

      if (lastSection && level > currentLevel) {
        section.parent = lastSection.id;
        this.sections.get(lastSection.id).children.push(id);
      }

      lastSection = section;
      currentLevel = level;
    });
  }

  findParentSection(level) {
    if (level === 1) return null;

    // Find the nearest section with a lower level
    const sections = Array.from(this.sections.values());
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].level < level) {
        return sections[i].id;
      }
    }
    return null;
  }

  findFormulasInSection(heading) {
    const formulas = new Set();
    let element = heading.nextElementSibling;

    while (element && !element.matches("h1, h2, h3, h4, h5, h6")) {
      const sectionFormulas = element.querySelectorAll("[data-math-enhanced]");
      sectionFormulas.forEach((formula) => formulas.add(formula));
      element = element.nextElementSibling;
    }

    return formulas;
  }

  generateSectionId(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  createControlPanel() {
    const panel = document.createElement("div");
    panel.className = "section-control-panel";
    panel.innerHTML = `
      <div class="section-panel-header">
        <h3>Section Control</h3>
        <div class="section-panel-actions">
          <button class="expand-all">Expand All</button>
          <button class="collapse-all">Collapse All</button>
          <button class="close-section-panel">×</button>
        </div>
      </div>
      <div class="section-tree"></div>
      <div class="section-rules">
        <h4>Enhancement Rules</h4>
        <div class="rule-list"></div>
        <button class="add-rule">Add Rule</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
    this.renderSectionTree();
  }

  renderSectionTree() {
    const treeContainer = this.panel.querySelector(".section-tree");
    treeContainer.innerHTML = this.buildSectionTreeHTML();
    this.setupTreeInteractions();
  }

  buildSectionTreeHTML(parentId = null, level = 0) {
    const sections = Array.from(this.sections.values())
      .filter((section) => section.parent === parentId)
      .sort((a, b) => a.index - b.index);

    if (sections.length === 0) return "";

    return sections
      .map(
        (section) => `
      <div class="section-item" data-section-id="${
        section.id
      }" data-level="${level}">
        <div class="section-header" style="padding-left: ${level * 20}px">
          <span class="section-toggle ${
            section.children.length ? "has-children" : ""
          }">
            ${section.children.length ? "▼" : ""}
          </span>
          <label class="section-label">
            <input type="checkbox" class="section-checkbox" 
                   ${section.enabled ? "checked" : ""}>
            <span class="section-title">${section.title}</span>
            <span class="formula-count">${section.formulas.size}</span>
          </label>
        </div>
        <div class="section-children">
          ${this.buildSectionTreeHTML(section.id, level + 1)}
        </div>
      </div>
    `
      )
      .join("");
  }

  setupTreeInteractions() {
    // Toggle section expansion
    this.panel.querySelectorAll(".section-toggle").forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        const item = e.target.closest(".section-item");
        item.classList.toggle("collapsed");
        toggle.textContent = item.classList.contains("collapsed") ? "▶" : "▼";
      });
    });

    // Checkbox handling with drag selection
    this.panel.querySelectorAll(".section-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("mousedown", (e) => {
        this.dragState.active = true;
        this.dragState.startSection =
          checkbox.closest(".section-item").dataset.sectionId;
        this.dragState.lastSection = this.dragState.startSection;
      });

      checkbox.addEventListener("mouseover", (e) => {
        if (this.dragState.active) {
          const currentSection =
            checkbox.closest(".section-item").dataset.sectionId;
          this.updateSelectionRange(currentSection);
        }
      });
    });

    // Global mouse up handler
    document.addEventListener("mouseup", () => {
      if (this.dragState.active) {
        this.dragState.active = false;
        this.persistState();
      }
    });
  }

  updateSelectionRange(currentSection) {
    const startIdx = this.getSectionIndex(this.dragState.startSection);
    const endIdx = this.getSectionIndex(currentSection);
    const lastIdx = this.getSectionIndex(this.dragState.lastSection);

    // Determine range direction
    const [fromIdx, toIdx] =
      startIdx < endIdx
        ? [Math.min(lastIdx, startIdx), endIdx]
        : [endIdx, Math.max(lastIdx, startIdx)];

    // Update checkboxes in range
    const sections = Array.from(this.sections.values()).sort(
      (a, b) => this.getSectionIndex(a.id) - this.getSectionIndex(b.id)
    );

    sections.forEach((section, idx) => {
      if (idx >= fromIdx && idx <= toIdx) {
        const checkbox = this.panel.querySelector(
          `[data-section-id="${section.id}"] .section-checkbox`
        );
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          this.updateSectionState(section.id, checkbox.checked);
        }
      }
    });

    this.dragState.lastSection = currentSection;
  }

  getSectionIndex(sectionId) {
    return Array.from(this.sections.keys()).indexOf(sectionId);
  }

  updateSectionState(sectionId, enabled) {
    const section = this.sections.get(sectionId);
    if (section) {
      section.enabled = enabled;
      section.formulas.forEach((formula) => {
        formula.classList.toggle("section-disabled", !enabled);
      });
    }
  }

  async loadPersistedState() {
    try {
      const state = await new Promise((resolve) => {
        chrome.storage.sync.get("sectionState", (data) =>
          resolve(data.sectionState || {})
        );
      });

      Object.entries(state).forEach(([sectionId, enabled]) => {
        const section = this.sections.get(sectionId);
        if (section) {
          section.enabled = enabled;
          const checkbox = this.panel.querySelector(
            `[data-section-id="${sectionId}"] .section-checkbox`
          );
          if (checkbox) checkbox.checked = enabled;
          this.updateSectionState(sectionId, enabled);
        }
      });
    } catch (error) {
      console.warn("Error loading persisted state:", error);
    }
  }

  persistState() {
    const state = {};
    this.sections.forEach((section, id) => {
      state[id] = section.enabled;
    });

    chrome.storage.sync.set({ sectionState: state });
  }

  initMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          const addedSections = Array.from(mutation.addedNodes).filter((node) =>
            node.matches?.("h1, h2, h3, h4, h5, h6")
          );
          if (addedSections.length > 0) {
            shouldUpdate = true;
          }
        }
      });

      if (shouldUpdate) {
        this.processCurrentDOM();
        this.renderSectionTree();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  window.sectionManager = new SectionManager();
  await window.sectionManager.init();
});
