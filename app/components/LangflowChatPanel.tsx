"use client";

import * as React from "react";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:4000";

export default function LangflowChatPanel() {
  const [msg, setMsg] = React.useState("");
  const [reply, setReply] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function askLangflow(message: string) {
    const r = await fetch(`${BACKEND}/api/langflow/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_value: message,
        session_id: "user_123",
      }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body?.detail || body?.error || `${r.status} ${r.statusText}`);
    }
    return r.json();
  }

async function onSend() {
  const text = msg.trim();
  if (!text) {
    setErr("Please type a message first.");
    return;
  }
  setErr(null);
  setLoading(true);
  try {
    const resp = await askLangflow(text);
    setReply(resp);
  } catch (e: any) {
    setErr(e.message || "Langflow request failed");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">Langflow Chat</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={onSend}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      {err && <p className="text-red-600 mt-2 text-sm">{err}</p>}

      {reply && (
        <div className="mt-4 p-2 border rounded bg-gray-50">
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(reply, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
