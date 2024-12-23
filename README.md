# LaTeX Color Highlighter Chrome Extension

## Overview

The LaTeX Color Highlighter is a Chrome extension designed to enhance the readability of LaTeX content on web pages, particularly on Wikipedia. It allows users to highlight LaTeX variables and text with custom colors, making complex mathematical articles easier to understand.

## Features

- **Context Menu Integration**: Easily color LaTeX selections via a right-click context menu.
- **Customizable Colors**: Choose default colors for common variables like `x`, `y`, `β` (beta), and `ε` (epsilon), or define custom variables and colors.
- **Real-Time Preview**: See changes in real-time as you select different colors.
- **Persistent Settings**: Save your color preferences locally so they're available each time you use the extension.
- **Variable Detection**: Automatically detects variables in LaTeX formulas
- **Color Coding**: Assign unique colors to different variables
- **Interactive Selection**: Click on formulas to select specific variables
- **Real-time Preview**: See color changes instantly

## Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory where this extension is located.

## Usage

1. Navigate to a Wikipedia page with LaTeX content.
2. Select the LaTeX text you want to highlight.
3. Right-click and choose "Color LaTeX" from the context menu.
4. Use the popup window to customize colors for variables.
5. Click "Apply Colors" to see the changes on the page.

### Basic Usage

- Visit any Wikipedia page with mathematical formulas
- Hover over formulas to see tooltips
- Click formulas to open the variable selector
- Select variables to highlight them

### Variable Selection

- Click any formula to open the variable panel
- Check boxes next to variables to highlight them
- Use color picker to change variable colors
- Use "Select All" or "Clear All" buttons

### Color Management

- Click color swatch next to variable
- Use color picker for custom colors
- Choose from predefined color schemes
- Adjust opacity with slider

### Formula Navigation

- Use tooltip arrows to navigate between formulas
- Click formula to focus and highlight
- Double-click to open in full view
- Right-click for context menu options

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

## Development

### Prerequisites

- Chrome browser
- Text editor (VS Code recommended)
- Basic understanding of JavaScript and Chrome Extensions

### Local Development

- Clone the repository
- Open Chrome Extensions page (chrome://extensions/)
- Enable Developer Mode
- Click "Load unpacked" and select the project folder
- Make changes to files and reload extension to test

### Code Style Guide

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

### Testing

1. **Manual Testing**

   - Test formula detection
   - Test variable parsing
   - Test color application
   - Test performance with many formulas

2. **Integration Testing**
   - Test with different Wikipedia pages
   - Test with various formula types
   - Test performance with many formulas
   - Test memory usage over time

### Performance Guidelines

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

## Permissions

- **activeTab**: Allows the extension to interact with the current tab.
- **scripting**: Enables the execution of scripts on web pages.
- **storage**: Used for saving user preferences.
- **contextMenus**: Allows the extension to add items to the context menu.

## Host Permissions

- The extension is currently configured to work on `*.wikipedia.org` domains.

## Troubleshooting

### Common Issues

1. **Highlighting Not Working**

   - Check if extension is enabled
   - Refresh the page
   - Clear browser cache
   - Check console for errors

2. **Slow Performance**

   - Reduce number of highlighted variables
   - Enable lazy loading
   - Increase processing delay
   - Clear cache

3. **Colors Not Saving**
   - Check storage permissions
   - Export presets as backup
   - Clear extension data
   - Reinstall extension

## Contributing

Feel free to fork this repository and submit pull requests. Any contributions to improve the extension are welcome!

## Contact

Rahees Ahmed - [@RaheesAhmed](https://github.com/RaheesAhmed)

Project Link: [https://github.com/RaheesAhmed/LaTeX-Color-Highlighter](https://github.com/RaheesAhmed/LaTeX-Color-Highlighter)
