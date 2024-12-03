# Development Guide

## Project Structure

```
LaTeX-Color-Highlighter/
├── manifest.json           # Extension manifest
├── background.js          # Service worker
├── js/
│   ├── content.js         # Main content script
│   ├── variable-manager.js    # Variable management
│   ├── section-manager.js     # Section management
│   ├── color-manager.js       # Color management
│   └── performance-monitor.js # Performance monitoring
├── css/
│   ├── content.css        # Content styles
│   ├── popup.css          # Popup styles
│   ├── variable-manager.css   # Variable UI styles
│   ├── section-manager.css    # Section UI styles
│   └── color-manager.css      # Color UI styles
├── popup/
│   ├── popup.html         # Extension popup
│   └── popup.js           # Popup script
└── icons/                 # Extension icons
```

## Core Components

### 1. Content Script (content.js)

The main script that processes formulas and handles interactions:

```javascript
// Core utilities for formula processing
const utils = {
  debounce()      // Event debouncing
  cleanVariable() // Clean LaTeX variables
  parseVariables() // Parse LaTeX formulas
  extractLatex()  // Extract LaTeX from DOM
}

// Tooltip management
const tooltipManager = {
  show()          // Show formula tooltip
  hide()          // Hide tooltip
  position()      // Position tooltip
}

// Data stores
const formulaStore    // Formula and variable data
const performanceCache // Performance optimization
```

### 2. Performance Monitor (performance-monitor.js)

Tracks extension performance:

```javascript
const PerformanceMonitor = {
  metrics        // Performance metrics
  trackRender()  // Track render times
  trackMemory()  // Track memory usage
  getReport()    // Get performance report
}
```

### 3. Popup Interface (popup.js)

Handles user settings and controls:

```javascript
// Settings management
loadSettings(); // Load user settings
saveSettings(); // Save user settings
applySettings(); // Apply settings to page

// UI updates
updateMetrics(); // Update performance display
updateStatus(); // Update status messages
```

## Development Setup

1. **Prerequisites**

   - Chrome browser
   - Text editor (VS Code recommended)
   - Basic understanding of JavaScript and Chrome Extensions

2. **Local Development**

   - Clone the repository
   - Open Chrome Extensions page (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked" and select the project folder
   - Make changes to files and reload extension to test

3. **Testing**
   - Test on different Wikipedia pages
   - Check console for errors
   - Verify performance in different scenarios
   - Test with various formula types

## Code Style Guide

1. **JavaScript**

   - Use ES6+ features
   - Follow Airbnb style guide
   - Use JSDoc comments
   - Use meaningful variable names
   - Keep functions small and focused
   - Use proper error handling

2. **CSS**

   - Use CSS variables for theming
   - Follow BEM naming convention
   - Keep selectors specific
   - Maintain dark mode support
   - Use flexbox/grid for layouts

3. **HTML**
   - Use semantic markup
   - Include ARIA attributes
   - Maintain proper heading hierarchy
   - Keep structure clean and nested properly

## Testing

1. **Manual Testing**

   ```javascript
   // Example test cases
   - Test formula detection
   - Test variable parsing
   - Test color application
   - Test performance with many formulas
   ```

2. **Integration Testing**

   - Test with different Wikipedia pages
   - Test with various formula types
   - Test performance with many formulas
   - Test memory usage over time

3. **Performance Testing**
   - Monitor load times
   - Check memory usage
   - Track CPU utilization
   - Verify battery impact

## Performance Guidelines

1. **Formula Processing**

   - Use lazy loading for formulas
   - Cache parsed results
   - Batch DOM updates
   - Use requestAnimationFrame

2. **Event Handling**

   - Debounce heavy operations
   - Use event delegation
   - Clean up event listeners
   - Optimize animations

3. **Memory Management**
   - Clear unused cache
   - Use WeakMap for DOM references
   - Limit stored data
   - Regular cleanup routines

## Debugging

1. **Console Logging**

   ```javascript
   // Development logging
   const DEBUG = true;
   if (DEBUG) {
     console.log("Debug:", data);
   }
   ```

2. **Performance Monitoring**

   ```javascript
   // Track performance
   PerformanceMonitor.trackOperation("formulaProcessed");
   ```

3. **Error Handling**
   ```javascript
   try {
     processFormula(element);
   } catch (error) {
     console.error("Error:", error);
     // Handle error gracefully
   }
   ```

## Release Process

1. **Version Update**

   - Update version in manifest.json
   - Update changelog
   - Test all features thoroughly

2. **Testing Checklist**

   - Basic functionality
   - Performance metrics
   - Cross-browser compatibility
   - Error handling
   - UI/UX testing

3. **Deployment**
   - Create ZIP package
   - Test packed extension
   - Submit to Chrome Web Store
   - Update documentation

## Best Practices

1. **Code Organization**

   - Keep files modular
   - Use consistent naming
   - Document complex logic
   - Maintain separation of concerns

2. **Performance**

   - Minimize DOM operations
   - Use efficient selectors
   - Optimize event handlers
   - Cache frequent operations

3. **Security**
   - Sanitize user input
   - Use Content Security Policy
   - Follow Chrome's security guidelines
   - Handle errors gracefully
