// server/routes/langflow.js
import { Router } from "express";
const router = Router();

router.post("/chat", async (req, res, next) => {
  try {
    // Log the raw body once to debug
    console.log("[/api/langflow/chat] body:", req.body);

    // Accept multiple shapes:
    // 1) { input_value: "..." }
    // 2) { input: "..." } or { message: "..." }
    // 3) { inputs: { input_value: "..." } }
    // 4) { data: { input_value: "..." } }
    const body = req.body || {};
    const input_value =
      body.input_value ??
      body.input ??
      body.message ??
      body?.inputs?.input_value ??
      body?.data?.input_value;

    const session_id =
      body.session_id ??
      body?.inputs?.session_id ??
      body?.data?.session_id ??
      "browser_user";

    if (!input_value || String(input_value).trim() === "") {
      const e = new Error("Missing input_value");
      e.status = 400;
      throw e;
    }

    const url = process.env.LANGFLOW_URL;
    const token = process.env.LANGFLOW_TOKEN;
    if (!url || !token) {
      const e = new Error("Langflow not configured (LANGFLOW_URL or LANGFLOW_TOKEN missing)");
      e.status = 500;
      throw e;
    }

    const payload = {
      input_value: String(input_value),
      output_type: "chat",
      input_type: "chat",
      session_id
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: "Langflow error", detail: text });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
