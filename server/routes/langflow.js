// server/routes/langflow.js
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const BASE_URL = process.env.LANGFLOW_API_URL;
const FLOW_ID = process.env.LANGFLOW_FLOW_ID;
const TOKEN = process.env.LANGFLOW_APPLICATION_TOKEN;
const ORG_ID = process.env.LANGFLOW_ORG_ID;

function extractText(resp) {
  try {
    const paths = [
      resp?.outputs?.[0]?.outputs?.[0]?.results?.message?.data?.text,
      resp?.outputs?.[0]?.outputs?.[0]?.results?.message?.text,
      resp?.outputs?.[0]?.outputs?.[0]?.artifacts?.message,
      resp?.message,
    ];
    for (const v of paths) if (typeof v === "string" && v.trim()) return v.trim();
  } catch {}
  return null;
}

router.post("/chat", async (req, res) => {
  try {
    const { input_value, session_id = "default" } = req.body;

    const url = `${BASE_URL}/${FLOW_ID}?stream=false`;
    const body = {
      output_type: "chat",
      input_type: "chat",
      input_value,
      session_id,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN}`,
        "X-DataStax-Current-Org": ORG_ID,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    if (!data) return res.status(502).json({ error: "Invalid JSON from Langflow" });

    const reply = extractText(data) || "No reply text found in response.";
    res.json({ reply, raw: data });
  } catch (e) {
    console.error("Langflow backend error:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
