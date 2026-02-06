import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { diagnosePlant, DiagnosePlantRequest } from "./gemini.server";

const app = express();

// CORS for local Vite dev server
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// JSON body parsing with 25mb limit
app.use(express.json({ limit: "25mb" }));

app.post("/api/diagnose", async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<DiagnosePlantRequest>;

    if (!body || !body.imageBase64 || !body.mimeType) {
      return res.status(400).json({
        error: "INVALID_REQUEST",
        message: "imageBase64 and mimeType are required",
      });
    }

    const result = await diagnosePlant({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      plantType: body.plantType || "Unknown",
      symptoms: body.symptoms || "",
      location: body.location || "",
      demoMode: body.demoMode ?? false,
    });

    return res.json(result);
  } catch (err: any) {
    const code = err?.message || "INTERNAL_ERROR";

    if (
      code === "GEMINI_API_KEY is not set in environment" ||
      code === "INVALID_API_KEY"
    ) {
      return res.status(500).json({
        error: "INVALID_API_KEY",
        message:
          "The Gemini API key is missing or invalid on the server.",
      });
    }

    if (code === "QUOTA_EXCEEDED") {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: "Gemini API quota exceeded.",
      });
    }

    if (code === "NOT_A_PLANT") {
      return res.status(400).json({
        error: "NOT_A_PLANT",
        message:
          "The uploaded image does not appear to contain a plant, crop, or fruit.",
      });
    }

    if (code === "MISSING_IMAGE_DATA") {
      return res.status(400).json({
        error: "MISSING_IMAGE_DATA",
        message: "Missing image data or mime type.",
      });
    }

    console.error("/api/diagnose error", err);

    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred while processing the diagnosis.",
    });
  }
});

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PlantMD backend listening on http://localhost:${PORT}`);
});
