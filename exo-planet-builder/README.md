# RED-SHIFT: Exoplanet Architect

> Procedural Exoplanet Generator & Sci-Fi Lore Engine powered by AI.
> Single-file application

![Status](https://img.shields.io/badge/Status-Operational-red)
![Tech](https://img.shields.io/badge/Stack-React_|_Tailwind_|_Gemini-black?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue)

**RED-SHIFT** is an experimental web application contained entirely within a single HTML file. It combines procedural pixel-art generation via HTML5 Canvas with the creativity of Artificial Intelligence (Google Gemini) to create unique, detailed worlds with their own history and scientific data.

---

## Main Features

* **Procedural Visual Engine:** Generates planetary textures pixel-by-pixel using noise algorithms and composition on HTML5 Canvas (no static images).
* **Infinite Lore with AI:** Direct integration with the Google Gemini API to generate scientific descriptions, history, inhabitants, and resources for every planet.
* **Single-File Architecture:** The entire application (Logic, UI, Styles, AI) resides in one `.html` file. No installation, Node.js, or build processes are required.
* **Retro-Brutalist Aesthetic:** Interface inspired by classic sci-fi terminals, featuring CRT effects, scanlines, and monospaced typography.
* **Export:** Download planetary discoveries as high-quality PNG images.
* **BYOK (Bring Your Own Key):** Runs entirely client-side. Your Google API Key is never sent to an intermediate server.

---

## Quick Start

Since this is a serverless application running in the browser, usage is immediate:

1.  **Download** the `index.html` file from this repository.
2.  **Open the file** by double-clicking it in your preferred web browser (Chrome, Edge, Brave, Safari).
3.  **Enter your API Key:** The application will request a Google Gemini API Key upon launch.
    * If you do not have one, you can get it for free at Google AI Studio.
4.  **Generate:** Adjust parameters in the left column and click "INITIATE GENESIS".

---

## Technology & Architecture

This project uses a unique hybrid architecture to function without bundlers:

* **React 18 (UMD):** Loaded as a global variable for interface management.
* **Google Generative AI SDK (ESM):** Loaded via a modern `importmap` to communicate with the AI.
* **Tailwind CSS (CDN):** On-the-fly utility styling.
* **Babel Standalone:** Real-time JSX compilation within the browser.

### Code Structure
The HTML file contains:
1.  **Canvas Engine:** Mathematical logic for drawing atmospheres, craters, and rings.
2.  **AI Service:** Engineering prompts to retrieve structured JSON responses from Gemini.
3.  **React UI:** Modular components (`Controls`, `PlanetPreview`) assembled in the same script.

---

## Security Note

This application requires a **Google Gemini API Key**.

* The key is stored **only in your browser's memory** while the tab is open.
* It is not saved in cookies, localStorage, nor sent to any server other than the official Google API.
* The code is open and auditable: you can view the source code to verify how the key is handled.

---

## License

This project is licensed under the MIT License. Feel free to modify, break, and create your own universes.

> "The universe is not only stranger than we imagine, it is stranger than we can imagine."
