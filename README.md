# PlantMD - AI Agricultural Diagnosis Platform

PlantMD is a production-grade Progressive Web Application (PWA) designed to assist farmers and gardeners in diagnosing plant diseases using advanced Multimodal AI. It leverages Google's Gemini models to analyze images and videos, provide treatment plans, and connect users with local agricultural resources.

## 🚀 Key Features

### 1. Multimodal Diagnosis (Gemini 3.0 Pro)
*   **Image & Video Analysis:** Users can upload photos or video clips of affected plants. The AI analyzes frames to identify pathogens with high accuracy.
*   **Robust Validation:** The system automatically detects if an uploaded image is *not* a plant (e.g., a selfie or webpage screenshot) and prevents the diagnosis, prompting the user to try again.
*   **Common Names:** Diagnoses are returned using simple, well-known disease names (e.g., "Tomato Blight") rather than obscure scientific jargon.

### 2. Intelligent Treatment Locator (Maps Grounding)
*   **Contextual Map Search:** When a specific fungicide or fertilizer is recommended in the treatment plan, users can click a **"Find"** button next to the product name.
*   **Live Inventory Search:** This triggers a specific search on the Dashboard map (e.g., "Agricultural stores selling Copper Fungicide nearby") using Gemini's Maps Grounding tool to find relevant local stockists.

### 3. Real-Time Expert Network
*   **Expert Finder:** The "Experts" tab uses geolocation and Gemini Maps Grounding to identify *real* agricultural consultants, university extension offices, and plant clinics in the user's immediate vicinity.
*   **Verified Data:** Displays real business names, locations, and ratings pulled dynamically from Google Maps data.

### 4. Diagnosis History
*   **Local Storage:** All diagnoses are saved locally to the device.
*   **Re-hydration:** Users can view full past reports from the history list. The app intelligently handles image caching and video previews for historical items.

### 5. AI Voice Assistant & TTS
*   **Chatbot:** A conversational interface to ask follow-up questions about the diagnosis.
*   **Text-to-Speech:** Generates audio summaries of the diagnosis using Gemini Flash TTS for accessibility.

### 6. Pro Dashboard
*   **Yield Calculator:** Visualizes potential crop loss vs. recovery value.
*   **Satellite Forecast:** (Simulated) visualization of NDVI and soil moisture data.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **AI Engine:** Google GenAI SDK (`@google/genai`)
    *   *Vision:* `gemini-3-pro-preview`
    *   *Maps/Grounding:* `gemini-2.5-flash`
    *   *TTS:* `gemini-2.5-flash-preview-tts`
*   **Maps:** Leaflet.js (OpenStreetMap tiles)
*   **Charts:** Chart.js
*   **Icons:** Lucide React

---

## 📋 Recent Updates (Changelog)

1.  **Non-Plant Image Filtering:** Added a pre-validation step in the AI prompt. If the uploaded media is not agricultural, the app throws a specific `NOT_A_PLANT` error and alerts the user, preventing wasted API calls and confusing results.
2.  **Product-Specific Map Routing:** Linked the "Results" view to the "Dashboard" map. Clicking "Find" on a treatment passes the specific chemical name as a search query to the Maps Grounding service.
3.  **Real Expert Data:** Replaced dummy data in the Experts view with live `googleMaps` tool calls to find actual local agronomists.
4.  **History Fixes:** Resolved issues where viewing old reports resulted in blank screens. Added logic to handle missing file objects by falling back to stored Base64 data.

---

## ⚙️ Setup & Running

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    Ensure your API key is set in `services/geminiService.ts` or passed via `process.env`.
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
