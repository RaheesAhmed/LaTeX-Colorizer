# LaTeX Color Highlighter Chrome Extension

## Overview

The LaTeX Color Highlighter is a Chrome extension designed to enhance the readability of LaTeX content on web pages, particularly on Wikipedia. It allows users to highlight LaTeX variables and text with custom colors, making complex mathematical articles easier to understand.

## Features

- **Context Menu Integration**: Easily color LaTeX selections via a right-click context menu.
- **Customizable Colors**: Choose default colors for common variables like `x`, `y`, `β` (beta), and `ε` (epsilon), or define custom variables and colors.
- **Real-Time Preview**: See changes in real-time as you select different colors.
- **Persistent Settings**: Save your color preferences locally so they're available each time you use the extension.

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

## File Descriptions

- **background.js**: Sets up the context menu and handles user interactions with it.
- **content.js**: Manages loading of styles and color application to LaTeX elements.
- **manifest.json**: Contains metadata about the extension and its permissions.
- **popup.html**: Defines the structure of the popup interface for color selection.
- **popup.js**: Handles the logic for color selection and application from the popup.

## Permissions

- **activeTab**: Allows the extension to interact with the current tab.
- **scripting**: Enables the execution of scripts on web pages.
- **storage**: Used for saving user preferences.
- **contextMenus**: Allows the extension to add items to the context menu.

## Host Permissions

- The extension is currently configured to work on `*.wikipedia.org` domains.

## Contributing

Feel free to fork this repository and submit pull requests. Any contributions to improve the extension are welcome!

## License

This project is licensed under the MIT License. See the LICENSE file for details.
