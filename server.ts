import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini client lazily to avoid crashing on startup if the key is missing.
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure proper error handling wrapper
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// API Endpoint: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Endpoint: Summarize selected text contents of the documents
app.post("/api/gemini/summarize", asyncHandler(async (req: express.Request, res: express.Response) => {
  const { files } = req.body; // Array of { name: string, type: string, text: string }
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Missing or invalid file content for summarization" });
  }

  const ai = getGeminiClient();

  // Create prompt detailing the file structure
  const formattedDocs = files
    .map((f, i) => `--- DOCUMENT ${i + 1}: ${f.name} (${f.type}) ---\n${f.text || "[No readable text content]"}`)
    .join("\n\n");

  const prompt = `You are a professional documentation synthesis assistant.
Your task is to analyze the following uploaded documents, aggregate their details, and write a cohesive, comprehensive Executive Summary.
This executive summary will serve as the introductory section of the merged/collated master PDF document.

Make the summary structured, formal, and informative. Use beautiful markdown with headers, bullet points, and key take-away sections.
Avoid using external assumptions; rely strictly on the provided document segments.

Here are the uploaded document segments:
${formattedDocs}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are the Document Collator Specialist. Create comprehensive, crisp, professional executive summaries from combined files.",
    }
  });

  res.json({ summary: response.text });
}));

// API Endpoint: Smart Collate sequence suggestion
app.post("/api/gemini/suggest-order", asyncHandler(async (req: express.Request, res: express.Response) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Missing file list" });
  }

  const ai = getGeminiClient();

  const fileMetadata = files.map((f, i) => ({
    index: i,
    name: f.name,
    type: f.type,
    excerpt: (f.text || "").slice(0, 500)
  }));

  const prompt = `You are an expert document organization system.
Analyze the following documents and suggest the most logical sequence to merge/collate them.
For instance, coordinate report files, appendices, financial sheets, and screenshots chronologically, alphabetically, or by logical topical flow (e.g., Cover/Intro -> Core Content -> Budgets/Excel -> Supporting Images -> Appendices).

Additionally, suggest a brief 'Section Title' and a 1-sentence 'Logical Reason' for why each document should be positioned at that index.

Return a JSON array of the suggested order. Each item in the array must look exactly like:
{
  "originalIndex": number,
  "name": "string",
  "sectionTitle": "string",
  "reason": "string"
}

Provide ONLY the valid parsed JSON array. Do not wrap in markdown or explain outside of the JSON block.

Documents list:
${JSON.stringify(fileMetadata, null, 2)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You suggest document collation order. Return strictly a raw JSON array matching the requested schema."
    }
  });

  const parsedResponse = JSON.parse(response.text?.trim() || "[]");
  res.json({ suggestions: parsedResponse });
}));

// API Endpoint: Conversational Document Assistant
app.post("/api/gemini/chat", asyncHandler(async (req: express.Request, res: express.Response) => {
  const { messages, files } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing chat messages transcript" });
  }

  const ai = getGeminiClient();

  // Create context from documents
  const documentContext = files && Array.isArray(files) && files.length > 0
    ? files.map((f, idx) => `[DOCUMENT ${idx + 1}: ${f.name}]\n${f.text || ""}`).join("\n\n")
    : "No document context uploaded.";

  const systemInstruction = `You are the ultimate 'Cohesive Document Collator Assistant'. 
The user has uploaded a sequence of documents to merge into a single PDF.
You have access to the exact extracted text content of these files. Your job is to help the user understand, filter, edit, query, and refine their documents.
Answer questions accurately based on this knowledge. Do not invent information. If an answer cannot be found in the text, clearly state that.

Knowledge Base Context:
${documentContext}`;

  // Get the latest query and full context
  const targetMessages = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: targetMessages,
    config: {
      systemInstruction
    }
  });

  res.json({ reply: response.text });
}));

// Setup Vite Dev Server / Static Asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Fallback Error Handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled express route error:", err);
    res.status(500).json({ error: err.message || "An unexpected error occurred" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Document Collate Server running at http://0.0.0.0:${PORT} [ENV: ${process.env.NODE_ENV || "development"}]`);
  });
}

startServer();
