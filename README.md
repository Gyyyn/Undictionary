# (Und)ictionary

(Und)ictionary is a modern, web-based dictionary application that leverages the extensive data of Wiktionary and Wikimedia. It runs of a single HTML file, no server needed. You can even use Gemini to explain thing to you, for free.

# Features

Multilingual Support: Look up words in multiple languages, including English, French, Spanish, Portuguese, German, Japanese, Russian, and Chinese.

Wiktionary Integration: Fetches comprehensive definition data directly from the relevant Wiktionary page.

Wikimedia Images: Displays relevant images from Wikimedia Commons to provide visual context for the searched word.

AI-Powered Explanations: Utilizes the Gemini API to provide simple, easy-to-understand explanations of complex definitions.

# How to Use

To Search: Open a new tab, type ud followed by a space in the address bar, and start typing your query. Or use the context menu on a highlighted word, or even just the button on the toolbar.

# Development Setup

To run this extension locally for development, you will need Node.js installed.

1. Clone the Repository: `git clone https://github.com/Gyyyn/Undictionary.git`

2. Install Dependencies: `npm install`

3. Build Static Assets:

## Compile Tailwind CSS
`npx @tailwindcss/cli -i ./input.css -o ./output.css`

4. Load the Extension in Your Browser (Make sure you're in the `firefox` branch if you're loading in a Gecko-based browser.

# Support and other projects

You can find a web-based version of the extension on [my tools repository](https://gyyyn.github.io), alongside other tools.

You can help support the development of this and other tools using [ko-fi](https://ko-fi.com/gyntenzyme)