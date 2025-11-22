# Lumina Fashion AI 🛍️✨

**A Next-Generation Semantic Search E-Commerce Experience.**

Lumina is a Single Page Application (SPA) that replaces traditional e-commerce filters with a conversational, empathetic, and intelligent AI stylist. Powered by **Google Gemini 2.5 Flash**, it understands context, style, and intent to find the perfect fashion item using a proprietary weighted scoring algorithm.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

---

## 🎯 Purpose & Vision

Traditional e-commerce search is rigid (e.g., filters for "Color: Red", "Category: Dress"). **Lumina** bridges the gap between human language and database inventory.

Instead of keywords, it understands **intent**:
*   *"I need something fresh for a beach wedding."* → Lumina understands "Linen/Cotton", "Elegant style", and "Dress/Suit".
*   *"I am a man."* → Lumina remembers this gender context for all future queries.
*   *"Show me something cheaper."* → Lumina analyzes the price of the previously shown item and searches for lower-priced alternatives.

---

## ⚙️ Technical Architecture

Lumina operates on a **Frontend-First AI Architecture**. There is no complex backend; the logic resides in the client, orchestrated by LLM reasoning.

### 1. The Cognitive Layer (NLU)
We use **Gemini 2.5 Flash** with a strict `responseSchema`. Instead of just chatting, the AI extracts structured data:
*   **Intent Extraction:** Normalizes "looks cool" to `style: 'Urban'` or "for a gala" to `occasion: 'Event'`.
*   **Contextual Memory:** The entire chat history is sent to the LLM. Crucially, we inject **hidden metadata blocks** (`[METADATA_PREVIOUS_PRODUCT: ...]`) into the prompt. This allows the AI to "see" what the user is looking at and make mathematical comparisons (e.g., price analysis) without the user seeing raw data.

### 2. The Search Engine (Weighted Scoring Algorithm)
Unlike standard SQL queries, Lumina uses a fuzzy scoring system (`calculateScore`) to rank results from the CSV dataset:
*   **Category Match:** +20 points (Anchor).
*   **Attribute Match (Color/Material/Occasion):** +10 points each.
*   **Style/Fit Match:** +5 points.
*   **Synergy Bonus:** +30 points if *both* Category and Color match (Prioritizes "Red Dress" over just "Red" items).
*   **Strict Filtering:** Gender and Category mismatches are filtered *before* scoring to prevent hallucinations (e.g., showing pants when asking for a shirt).

### 3. "On-the-Fly" Image Generation with Caching
To simulate a massive high-quality inventory without a database of images:
*   **Deterministic Generation:** We use `pollinations.ai` to generate fashion photography.
*   **Seed Consistency:** The image URL is constructed using a hash of the product attributes. This means a "Green Cotton T-Shirt" will **always** generate the exact same image for every user.
*   **Browser Caching:** Generated URLs are stored in `localStorage`. Subsequent requests for similar items load instantly, simulating a fast CDN.

### 4. Honest AI Fallback
The system intercepts AI responses to prevent "hallucinations":
*   If the AI says "Here is your green pant" but the inventory only had a brown one (and the search engine returned the brown one as the closest match), the UI logic overrides the text to say: *"I couldn't find a green one, but this brown option fits your style perfectly."*

---

## ⚠️ Data Disclaimer

**Please Note:** The product database used in this demo is entirely **synthetic**. 
*   The inventory consists of randomized data points to demonstrate the search capability.
*   Prices, categories, and attribute combinations may not correspond to real-world logic (e.g., you might find a €15 wedding dress or a €900 t-shirt).
*   The focus of this project is the **AI Architecture** and **Search Logic**, not the commercial accuracy of the dataset.

---

## 🚀 Key Features

*   **Sticky Context:** If you ask for "A t-shirt" and then say "Actually, in red", Lumina knows you still want a t-shirt.
*   **Gender Persistence:** Once you declare "I am a man", Lumina filters all future results by gender until told otherwise.
*   **Smart Pricing:** Intelligent handling of "cheaper" or "more expensive" requests relative to the current context.
*   **Special "Easter Egg":** Ask for "The coolest t-shirt" or mention "Accenture" to unlock a specific, premium demo item with a custom generated design.
*   **Glassmorphism UI:** A modern, translucent interface built with Tailwind CSS.

---

## 🛠️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/lumina-fashion-ai.git
    cd lumina-fashion-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API Key:**
    Create a `.env` file in the root and add your Google Gemini API Key:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

---

## 🧪 Demo Scenarios (How to test it)

1.  **The Context Test:**
    *   User: *"I'm looking for a dress for a wedding."*
    *   User: *"Do you have it in red?"* (System remembers "Dress" and "Wedding").
    *   User: *"Something cheaper."* (System compares price with the previous red dress).

2.  **The Gender Test:**
    *   User: *"I am a man."*
    *   User: *"I need a jacket."* (System strictly shows men's jackets).

3.  **The "Honest AI" Test:**
    *   User: *"I want a purple tuxedo made of plastic."* (Likely not in stock).
    *   System: Finds the closest match (e.g., a blue suit) but explicitly tells you it doesn't have exactly what you asked for, offering the alternative instead.

4.  **The Hackathon Special:**
    *   User: *"Show me the coolest t-shirt you have."*
    *   System: Reveals the "Gen AI Mavericks" exclusive item.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built for the Accenture GenAI Hackathon.* 🚀