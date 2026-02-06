import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DiagnosisResult } from "../types";

// --- INTERNAL CLIENT SETUP (NODE ONLY) ---

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  return new GoogleGenAI({ apiKey });
};

// Generic retry with basic backoff for transient errors
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("Quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED");

    const isServerOverload = error?.status === 503 || error?.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryWithBackoff(operation, retries - 1, delayMs * 2);
    }

    if (isRateLimit) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (
      error?.message?.includes("API key") ||
      error?.status === 400 ||
      error?.status === 403
    ) {
      throw new Error("INVALID_API_KEY");
    }

    throw error;
  }
}

export interface DiagnosePlantRequest {
  imageBase64: string; // raw base64, no data: prefix
  mimeType: string;
  plantType: string;
  symptoms: string;
  location: string;
  demoMode?: boolean;
}

export async function diagnosePlant(
  payload: DiagnosePlantRequest
): Promise<DiagnosisResult> {
  const { imageBase64, mimeType, plantType, symptoms, location, demoMode } =
    payload;

  if (!imageBase64 || !mimeType) {
    throw new Error("MISSING_IMAGE_DATA");
  }

  if (demoMode) {
    // Demo-safe: no API call, no key required.
    return {
      id: Date.now().toString(),
      diseaseName: "Late Blight (Common)",
      confidence: 95,
      severity: "Severe",
      affectedParts: ["Leaves"],
      description:
        "This is a demo diagnosis. Real AI analysis is disabled in demo mode.",
      causes: "Demo Mode",
      spreadRisk: "High",
      organicTreatment: ["Demo Step 1"],
      chemicalTreatment: ["Demo Chemical"],
      preventiveMeasures: ["Demo Prevention"],
      urgency: "Immediate",
      recoveryTimeline: "1 week",
      plantType,
      symptoms,
      image: `data:${mimeType};base64,${imageBase64}`,
      date: new Date().toISOString(),
    };
  }

  const client = getAiClient();
  const modelId = "gemini-3-flash-preview";

  const isVideo = mimeType.startsWith("video/");

  const prompt = `
    You are an expert plant pathologist.

    STEP 1: VALIDATION
    Analyze the uploaded ${
      isVideo ? "video" : "image"
    }. Determine if it contains a plant, crop, leaf, fruit, or agricultural scene.
    If it is a screenshot of text, a person, a building, a webpage, or a random object unrelated to farming/gardening,
    return STRICT JSON with "isPlant": false.

    STEP 2: DIAGNOSIS (Only if Step 1 passed)
    Analyze the plant issues.
    Plant Type Context: ${plantType}.
    Symptoms reported: ${symptoms}.
    Location: ${location}.

    If it is a video, analyze the frames to find the best angle of the disease.

    Return STRICT JSON only, with no markdown and no additional commentary, exactly in this shape:
    {
      "isPlant": true,
      "diseaseName": "Common Disease Name (Simple & Well Known, e.g. 'Tomato Blight' instead of scientific name)",
      "confidence": 0-100,
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

  const response = await retryWithBackoff<GenerateContentResponse>(() =>
    client.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
      config: { responseMimeType: "application/json" },
    })
  );

  const rawText = response.text;
  if (!rawText) {
    throw new Error("NO_RESPONSE_FROM_MODEL");
  }

  let jsonStr = rawText.trim();
  const match = rawText.match(/\{[\s\S]*\}/);
  if (match) {
    jsonStr = match[0];
  } else {
    jsonStr = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (parsed.isPlant === false) {
    throw new Error("NOT_A_PLANT");
  }

  const result: DiagnosisResult = {
    ...parsed,
    id: Date.now().toString(),
    plantType,
    symptoms,
    image: isVideo ? undefined : `data:${mimeType};base64,${imageBase64}`,
    date: new Date().toISOString(),
  };

  return result;
}
