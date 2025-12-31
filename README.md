# RetailGenius AI 🎨🛒
> The intelligent, compliant retail media creative builder.

RetailGenius AI is a powerful web-based tool designed to help retail marketers create high-impact, compliant digital advertising assets. It leverages Generative AI (powered by **Puter.js**) to automate creative strategy, copywriting, and visual design while strictly enforcing retailer compliance guidelines (Appendix A & B).

![RetailGenius AI](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6) 
*(Note: Replace with actual screenshot if available)*

## ✨ Key Features

### 🤖 AI-Powered Creativity
*   **Magic Creative Builder**: describe a product (e.g., "Tesco Finest Pizza, movie night"), and the AI will:
    *   Develop a creative strategy.
    *   Write a compliant, engaging headline.
    *   Generate a high-definition (HD), studio-quality background image using **DALL-E 3**.
*   **Smart Copywriter**: Generates ad headlines tailored to specific tones (Exciting, Premium, Friendly) while automatically adhering to negative keyword lists.
*   **Background Generator**: Create custom 8K-style minimalist commercial backgrounds on demand.

### 🛡️ Real-Time Compliance Audit
Ensures all creatives meet strict retailer guidelines (Appendix A & B standards).
*   **Semantic Check**: Scans text for banned terms (e.g., "Money-back", "Best", sustainability claims without proof).
*   **Geometric Check**:
    *   **Safe Zones**: Warns if key elements encroach on restricted areas (e.g., 9:16 story margins).
    *   **Overlap Detection**: Prevents elements from obscuring mandatory tags or value tiles.
    *   **Font Sizing**: Flags text smaller than the accessibility minimum (20px).
*   **Asset Validation**: Checks for correct placement of Packshots vs. CTAs and ensures mandatory legal tags (e.g., "Clubcard" dates, "Drinkaware" for alcohol) are present.

### 🛠️ Professional Design Tools
*   **Smart Templates**: One-click generation of standard layouts like "Low Everyday Price" (LEP).
*   **Canvas Editor**: Full drag-and-drop support, z-index layering, resizing, and alignment.
*   **Asset Library**: Drag in compliant assets like Clubcard Value Tiles, "Only at Tesco" roundels, and legal disclaimers.

## 🚀 Getting Started

This project is built with **React**, **Vite**, **Tailwind CSS**, and **Puter.js**.

### Prerequisites
*   Node.js (v18 or higher recommended)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/retailgenius-ai.git
    cd retailgenius-ai
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

The application will launch at `http://localhost:5173` (or similar).

> **Note:** This project uses **Puter.js** for AI services. No API keys are required for local development! usage is handled directly via the browser-based Puter.js integration.

## 🧩 Usage Guide

1.  **Format Selection**: Choose your canvas size (e.g., Mobile Banner, Story 9:16, MPU).
2.  **Magic Build**: Enter a product and context in the "Create" tab to auto-generate a starting point.
3.  **Customize**:
    *   Click elements to edit text, color, or arrange layers.
    *   Upload your own product packshots.
    *   Add "Value Tiles" or "Legal Tags" from the sidebar.
4.  **Audit**: Switch to the "Brand" tab and click "Run Full Audit" to see a compliance score and fix suggestions.

## 🏗️ Technology Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **AI Services**: Puter.js (Chat & DALL-E 3 Image Generation)
*   **Utilities**: html2canvas (for export)

## 📄 License

[MIT](LICENSE)
