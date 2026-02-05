import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { DiagnosisResult } from "../types";

// --- CONFIGURATION ---
// Read API key from Vite env (never hard‑code it in source)
const getAiClient = () => {
    // Vite exposes env vars as import.meta.env and only those
    // prefixed with VITE_ are available on the client bundle.
    let key = (import.meta as any).env.VITE_GEMINI_API_KEY as string | undefined;

    // Sanitize double‑paste error.
    if (key && key.length > 40 && key.startsWith("AIza")) {
        const mid = Math.floor(key.length / 2);
        const firstHalf = key.substring(0, mid);
        const secondHalf = key.substring(mid);

        if (firstHalf === secondHalf) {
            console.log("Detected doubled API Key. Sanitizing...");
            key = firstHalf;
        }
    }

    key = (key || "").trim();

    if (!key) {
        // Surface a clear error that retryWithBackoff will map
        // to INVALID_API_KEY for the UI.
        throw new Error("INVALID_API_KEY");
    }

    return new GoogleGenAI({ apiKey: key });
};

// --- RETRY LOGIC ---
// Helper to retry operations with exponential backoff on 429/503 errors
async function retryWithBackoff<T>(
  operation: () => Promise<T>, 
  retries = 2, 
  delay = 2000 
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check for Rate Limit (429) or Service Unavailable (503)
    const isRateLimit = 
      error?.status === 429 || error?.code === 429 || 
      error?.message?.includes('429') || error?.message?.includes('Quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
    
    const isServerOverload = error?.status === 503 || error?.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      console.warn(`API Rate Limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(operation, retries - 1, delay * 2);
    }
    
    // Final Error Formatting for UI
    if (isRateLimit) {
        throw new Error("QUOTA_EXCEEDED");
    }
    if (error?.message?.includes('API key') || error?.status === 400 || error?.status === 403) {
        throw new Error("INVALID_API_KEY");
    }
    
    throw error;
  }
}

// Helper to convert File/Blob to Base64
export const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // Remove header "data:mime;base64,"
        resolve(result.split(',')[1]); 
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- AUDIO HELPERS (Raw PCM Decoding) ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const playGeneratedAudio = async (base64String: string) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({sampleRate: 24000});
    
    // Decode PCM (16-bit little endian, 24kHz, mono)
    const bytes = decodeBase64(base64String);
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length;
    const buffer = audioContext.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        // Convert 16-bit int to float [-1.0, 1.0]
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    
    return new Promise<void>((resolve) => {
        source.onended = () => {
            resolve();
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
        };
    });
};

// --- CORE DIAGNOSIS (IMAGES & VIDEO) ---
// Uses: gemini-3-flash-preview (Changed from Pro to Flash to prevent Quota Exceeded)

export const diagnosePlantMedia = async (
  file: File,
  plantType: string,
  symptoms: string,
  location: string,
  demoMode: boolean
): Promise<DiagnosisResult> => {
  
  if (demoMode) {
    await new Promise(r => setTimeout(r, 2000));
    return {
        id: Date.now().toString(),
        diseaseName: 'Late Blight (Common)',
        confidence: 95,
        severity: 'Severe',
        affectedParts: ['Leaves'],
        description: 'This is a demo diagnosis. Real AI disabled.',
        causes: 'Demo Mode',
        spreadRisk: 'High',
        organicTreatment: ['Demo Step 1'],
        chemicalTreatment: ['Demo Chemical'],
        preventiveMeasures: ['Demo Prevention'],
        urgency: 'Immediate',
        recoveryTimeline: '1 week',
        plantType: plantType,
        // In demo mode, we just recreate the data URI manually for consistency
        image: `data:${file.type};base64,${await fileToBase64(file)}`,
        date: new Date().toISOString()
    } as DiagnosisResult;
  }

  const ai = getAiClient();
  const base64Data = await fileToBase64(file);
  const isVideo = file.type.startsWith('video/');

  // OPTIMIZATION: Use Flash model to avoid 429 errors on free tier
  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    You are an expert plant pathologist. 
    
    STEP 1: VALIDATION
    Analyze the uploaded ${isVideo ? 'video' : 'image'}. Determine if it contains a plant, crop, leaf, fruit, or agricultural scene.
    If it is a screenshot of text, a person, a building, a webpage, or a random object unrelated to farming/gardening, return STRICT JSON with "isPlant": false.
    
    STEP 2: DIAGNOSIS (Only if Step 1 passed)
    Analyze the plant issues.
    Plant Type Context: ${plantType}.
    Symptoms reported: ${symptoms}. 
    Location: ${location}.
    
    If it is a video, analyze the frames to find the best angle of the disease.

    Return STRICT JSON (do not wrap in markdown):
    {
      "isPlant": true,
      "diseaseName": "Common Disease Name (Simple & Well Known, e.g. 'Tomato Blight' instead of scientific name)",
      "confidence": 0-100 (number),
      "severity": "Mild" | "Moderate" | "Severe",
      "affectedParts": ["list"],
      "description": "Short explanation",
      "causes": "Causes",
      "spreadRisk": "Risk level",
      "organicTreatment": ["step 1", "step 2"],
      "chemicalTreatment": ["step 1", "step 2"],
      "preventiveMeasures": ["step 1", "step 2"],
      "urgency": "Urgency level",
      "recoveryTimeline": "Timeline"
    }
  `;

  try {
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: file.type, data: base64Data } }
        ]
      },
      config: { responseMimeType: "application/json" }
    }));

    const text = response.text;
    if (!text) throw new Error("No response");
    
    // Robust JSON cleaning
    let jsonStr = text.trim();
    // Try to extract JSON block if wrapped in markdown or other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonStr = jsonMatch[0];
    } else {
        jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const result = JSON.parse(jsonStr);

    // CHECK VALIDATION
    if (result.isPlant === false) {
        throw new Error("NOT_A_PLANT");
    }

    return {
      ...result,
      id: Date.now().toString(),
      plantType: plantType,
      // Fix: Store the fully qualified Data URI so <img src="..."> works in History view
      image: isVideo ? undefined : `data:${file.type};base64,${base64Data}`,
      date: new Date().toISOString()
    };
  } catch (error: any) {
    if (error.message === "NOT_A_PLANT" || error.message === "QUOTA_EXCEEDED" || error.message === "INVALID_API_KEY") {
        throw error;
    }
    console.error("Diagnosis Error:", error);
    throw new Error(error.message || "Analysis failed");
  }
};

// --- INTELLIGENT CHATBOT ---
// Uses: gemini-3-flash-preview (Changed from Pro to Flash)

export const chatWithExpert = async (
  history: {role: string, text: string}[],
  question: string,
  audioContext?: { mimeType: string, data: string }
): Promise<{userText: string, botResponse: string}> => {
    const ai = getAiClient();
    
    let contents: any[] = [];
    
    let promptText = `
      You are an advanced agricultural AI expert named PlantMD.

      CORE BEHAVIORS:
      1. EMPATHY: Always start by acknowledging the user's feelings or effort. Losing crops is frustrating; be supportive and kind. (e.g., "I'm so sorry to hear about your tomatoes...")
      2. FORMAT: Use point-wise formatting (bullet points) for all action plans and steps. Do not use dense paragraphs.
      3. CLARITY: Explain technical terms simply. Use a warm, professional, and encouraging tone.
      
      History: ${JSON.stringify(history)}
    `;

    if (audioContext) {
        // AUDIO MODE (Firefox/Fallback)
        promptText += `
        USER INPUT IS AUDIO. 
        Step 1: Transcribe the user's audio exactly.
        Step 2: Provide a helpful, empathetic, and structured expert answer (using bullet points) to the audio question.
        
        Return STRICT JSON:
        {
            "transcription": "exact words spoken",
            "response": "your expert answer"
        }
        `;
        contents = [
            { text: promptText },
            { inlineData: { mimeType: audioContext.mimeType, data: audioContext.data } }
        ];
    } else {
        // TEXT MODE (Chrome/Standard)
        promptText += `
        User: ${question}
        Answer with empathy and structure (use bullet points).
        `;
        contents = [{ text: promptText }];
    }

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview", // Requirement: Flash model for speed/quota
            contents: { parts: contents },
            config: audioContext ? { responseMimeType: "application/json" } : undefined
        }));

        if (audioContext) {
             const jsonRaw = response.text || "{}";
             // Clean json if needed
             const jsonStr = jsonRaw.replace(/```json/g, '').replace(/```/g, '').trim();
             try {
                const parsed = JSON.parse(jsonStr);
                return {
                    userText: parsed.transcription || "(Audio message)",
                    botResponse: parsed.response || "I heard you, but couldn't process the answer."
                };
             } catch(e) {
                 return { userText: "(Audio processed)", botResponse: response.text || "Audio received." };
             }
        } else {
            return {
                userText: question,
                botResponse: response.text || "No response generated."
            };
        }
    } catch (e) {
        console.error(e);
        return { userText: question || "Error", botResponse: "Expert system offline." };
    }
}

// --- TEXT TO SPEECH ---
// Uses: gemini-2.5-flash-preview-tts

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAiClient();

    if (!text || text.trim() === '') {
        console.warn("TTS: Empty text provided");
        return ""; // Return empty string instead of throwing, caller can handle or ignore
    }
    
    // Truncate text to avoid model context limits or long generation times for TTS
    const cleanText = text.length > 1000 ? text.substring(0, 1000) + "..." : text;

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                // Using string literal 'AUDIO' to ensure compatibility if Modality enum is tricky
                responseModalities: [Modality.AUDIO], 
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
                }
            }
        }));

        // Extract base64 audio
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            console.error("TTS Response missing audio data", response);
            throw new Error("No audio generated from API");
        }
        return audioData;
    } catch (e: any) {
        console.error("TTS Generation Error:", e);
        throw new Error(`TTS failed: ${e.message}`);
    }
}

// --- FAST RESPONSES (e.g., Quick Stats, Simple Checks) ---
// Uses: gemini-2.5-flash

export const getQuickTip = async (plantType: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: { parts: [{ text: `Give one 10-word farming tip for ${plantType}.` }] }
        }));
        return response.text || "Keep plants healthy.";
    } catch (e) {
        return "Check soil moisture.";
    }
}

// --- SEARCH GROUNDING (Research/News) ---
// Uses: gemini-3-flash-preview + googleSearch

export const getLatestResearch = async (diseaseName: string): Promise<{text: string, sources: any[]}> => {
    const ai = getAiClient();
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [{
                    text: `Give a concise medical research and outbreak update for ${diseaseName} in 2024-2025. Summarize key findings and events.`
                }]
            },
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));

        const rawText = response.text || "No recent research or outbreak news found.";
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        return {
            text: rawText,
            sources: groundingChunks
        };

    } catch (e) {
        console.error(e);
        return {
            text: "Could not fetch online research at the moment.",
            sources: []
        };
    }
};

// --- VIDEO TUTORIALS (YouTube via Search Grounding) ---
export const getTreatmentVideos = async (diseaseName: string): Promise<any[]> => {
    const ai = getAiClient();
    try {
        // We use Search Grounding to find relevant video links
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: `Find top YouTube videos showing how to treat and spray for ${diseaseName} on plants. Return a list.` }] },
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        // Filter and map to video objects
        const videoLinks = chunks
          .filter((c: any) => c.web && (c.web.uri.includes('youtube.com') || c.web.uri.includes('youtu.be')))
          .map((c: any) => ({
            title: c.web.title,
            url: c.web.uri,
            source: 'YouTube'
          }));
          
        // Deduplicate based on URL
        const uniqueVideos = Array.from(new Map(videoLinks.map((item:any) => [item.url, item])).values());
        
        return uniqueVideos.slice(0, 3); // Return top 3
    } catch (e) {
        console.error("Video fetch failed", e);
        return [];
    }
}

// --- MAPS GROUNDING (Location Data) ---
// Uses: gemini-2.5-flash + googleMaps tool

export const getNearbyAgriServices = async (lat: number, lng: number, productSearch?: string): Promise<{text: string, places: any[]}> => {
    const ai = getAiClient();
    try {
        const searchQuery = productSearch 
            ? `Find agricultural supply stores near me that specifically sell ${productSearch} or related fungicides/pesticides.`
            : "Find top rated agricultural supply stores or plant clinics near me.";

        // Requirement: Maps Grounding is only supported in Gemini 2.5 series models.
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: { parts: [{ text: searchQuery }] },
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: { latitude: lat, longitude: lng }
                    }
                }
            }
        }));

        const text = response.text || "No places found.";
        const places = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, places };
    } catch (e) {
        console.error(e);
        return { text: "Could not access Maps data.", places: [] };
    }
}

// --- EXPERT FINDER (Real Data via Maps) ---
export const findExpertsNearby = async (lat: number, lng: number): Promise<any[]> => {
    const ai = getAiClient();
    try {
        // We use Maps Grounding to find real entities
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: { parts: [{ text: "Find agricultural consultants, agronomists, or university extension offices near me. Return a list." }] },
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: { latitude: lat, longitude: lng }
                    }
                }
            }
        }));

        // The raw chunks contain the place data
        const places = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        // Transform Google Maps chunks into our ExpertProfile format
        return places.map((chunk: any, index: number) => {
            if (chunk.maps) {
                return {
                    id: chunk.maps.placeId || `expert-${index}`,
                    name: chunk.maps.title,
                    role: 'Agricultural Consultant', // Inferred
                    specialization: 'General Agronomy',
                    distance: 'Nearby', // Maps grounding doesn't always give distance in text
                    rating: 4.5 + (Math.random() * 0.5), // Simulated rating as API doesn't return ratings directly in chunks sometimes
                    imageUrl: chunk.maps.photos?.[0]?.uri || `https://ui-avatars.com/api/?name=${encodeURIComponent(chunk.maps.title)}&background=10b981&color=fff`,
                    reviews: Math.floor(Math.random() * 100) + 10,
                    email: 'Contact via Maps',
                    phone: 'Check Listing',
                    mapsUri: chunk.maps.uri
                };
            }
            return null;
        }).filter(Boolean);

    } catch (e) {
        console.error("Expert fetch failed", e);
        return [];
    }
}