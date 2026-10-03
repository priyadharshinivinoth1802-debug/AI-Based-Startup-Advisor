import express from "express";
import cors from "cors";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { analyze, requiredFields, cleanText } = require("../engine.js");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(root)); // also serves the frontend: open http://localhost:3000

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Business Advisor Algorithm API", aiProvider: "none" });
});

app.post("/api/analyze", (req, res) => {
  try {
    const data = req.body || {};
    const missing = requiredFields.filter(key => !cleanText(data[key], 300));
    if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return res.status(400).json({ error: "Please enter a valid email address." });
    return res.json(analyze(data));
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Unable to generate analysis." });
  }
});

app.listen(PORT, () => console.log(`Business Advisor running on http://localhost:${PORT}`));
