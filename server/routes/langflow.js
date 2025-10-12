// server/routes/langflow.js
import { Router } from 'express';

const router = Router();

router.post('/chat', async (req, res, next) => {
  try {
    const HOST = process.env.LANGFLOW_HOST_URL;           // must include /lf/<workspace>
    const FLOW_ID = process.env.LANGFLOW_FLOW_ID;         // a5827591-b2bc-4416-914d-90c87cc59314
    const TOKEN = process.env.LANGFLOW_APPLICATION_TOKEN; // Bearer token

    if (!HOST || !FLOW_ID || !TOKEN) {
      console.error('[Langflow] Missing envs', { HOST: !!HOST, FLOW_ID: !!FLOW_ID, TOKEN: !!TOKEN });
      return res.status(500).json({ error: 'Langflow env vars missing' });
    }

    const { input_value, session_id = 'web_user', tweaks } = req.body || {};
    if (!input_value || typeof input_value !== 'string') {
      console.warn('[Langflow] 400: input_value missing or not string', req.body);
      return res.status(400).json({ error: 'input_value (string) is required' });
    }

    const url = `${HOST.replace(/\/$/, '')}/api/v1/run/${encodeURIComponent(FLOW_ID)}`;
    const payload = {
      input_value,
      output_type: 'chat',
      input_type: 'chat',
      ...(session_id ? { session_id } : {}),
      ...(tweaks ? { tweaks } : {})
    };

    console.log('[Langflow] ->', url, JSON.stringify(payload));

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!r.ok) {
      console.error('[Langflow] <-', r.status, json);
      return res.status(r.status).json(json);
    }

    console.log('[Langflow] <- 200 OK');
    return res.json(json);
  } catch (err) {
    console.error('[Langflow] Exception', err);
    next(err);
  }
});

router.post('/feedback', async (req, res) => {
  console.log('[Langflow feedback]', { ...req.body, at: new Date().toISOString() });
  res.json({ ok: true });
});

export default router;
