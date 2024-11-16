# LaTeX Color Highlighter

A Chrome extension that enhances LaTeX formulas on Wikipedia pages with color highlighting.

## Installation

### Chrome Extension Setup

1. Download the `latex.zip` file and extract its contents
2. Navigate to `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the extracted extension folder
6. Visit any Wikipedia page and click the extension icon to activate highlighting

### Local Development Setup

1. Clone the repository

```bash
git clone https://github.com/RaheesAhmed/LaTeX-Color-Highlighter.git
```

2. Navigate to the project directory

```bash
cd LaTeX-Color-Highlighter
```

3 Install dependencies

```bash
npm install
```

4. file `manifest.json` is the chrome extension manifest file.
5. file `content.js` is the javascript code that runs on the wikipedia page.
6. file `popup.html` is the html code for the chrome extension popup.
7. file `styles/content.css` is the css code for the content script.
8. file `lib/katex.min.js` and `lib/katex.min.css` are the KaTeX library files.

## Features

- Automatic LaTeX formula detection on Wikipedia pages
- Color highlighting for improved formula readability
- Interactive browser extension interface
