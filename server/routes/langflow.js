// server/routes/langflow.js
import { Router } from 'express';

const router = Router();

/**
 * POST /api/langflow/chat
 * body: { input_value: string, session_id?: string, tweaks?: object }
 */
router.post('/chat', async (req, res, next) => {
  try {
    const HOST = process.env.LANGFLOW_HOST_URL;           // e.g. https://api.langflow.astra.datastax.com/lf/<workspace>
    const FLOW_ID = process.env.LANGFLOW_FLOW_ID;         // a5827591-b2bc-4416-914d-90c87cc59314
    const TOKEN = process.env.LANGFLOW_APPLICATION_TOKEN; // Bearer token

    if (!HOST || !FLOW_ID || !TOKEN) {
      return res.status(500).json({ error: 'Langflow env vars missing' });
    }

    const { input_value, session_id = 'local_user', tweaks } = req.body || {};
    if (!input_value || typeof input_value !== 'string') {
      return res.status(400).json({ error: 'input_value (string) is required' });
    }

    const url = `${HOST}/api/v1/run/${encodeURIComponent(FLOW_ID)}`;

    const payload = {
      input_value,
      output_type: 'chat',
      input_type: 'chat',
      ...(session_id ? { session_id } : {}),
      ...(tweaks ? { tweaks } : {})
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text(); // try parsing after
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!r.ok) {
      return res.status(r.status).json(json || { error: `${r.status} ${r.statusText}` });
    }
    return res.json(json);
  } catch (err) {
    next(err);
  }
});

router.post('/feedback', async (req, res) => {
  const { kind, comment, last_prompt, last_reply, session_id } = req.body || {};
  // For now, just log it; later you can persist or forward to Langflow
  console.log('[Langflow feedback]', {
    kind, comment, last_prompt, last_reply, session_id, at: new Date().toISOString()
  });
  return res.json({ ok: true });
});

export default router;
