"use client";

import * as React from "react";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:4000";

/** Safely pull the first text reply from the Langflow JSON. */
function extractFirstMessageText(resp: any): string | null {
  try {
    const p1 = resp?.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
    if (typeof p1 === "string" && p1.trim()) return p1.trim();

    const p2 = resp?.outputs?.[0]?.outputs?.[0]?.results?.message?.data?.text;
    if (typeof p2 === "string" && p2.trim()) return p2.trim();

    const p3 = resp?.outputs?.[0]?.outputs?.[0]?.artifacts?.message;
    if (typeof p3 === "string" && p3.trim()) return p3.trim();

    const p4 = resp?.outputs?.[0]?.outputs?.[0]?.outputs?.message?.message;
    if (typeof p4 === "string" && p4.trim()) return p4.trim();

    const p5 = resp?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message;
    if (typeof p5 === "string" && p5.trim()) return p5.trim();

    return null;
  } catch {
    return null;
  }
}

export default function LangflowChatPanel() {
  const [msg, setMsg] = React.useState("");
  const [lastPrompt, setLastPrompt] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // feedback UI state
  const [fbSending, setFbSending] = React.useState(false);
  const [fbMsg, setFbMsg] = React.useState<string | null>(null);
  const [fbDone, setFbDone] = React.useState(false);
  const [showDownBox, setShowDownBox] = React.useState(false);
  const [downComment, setDownComment] = React.useState("");

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
      throw new Error(
        body?.detail || body?.error || `${r.status} ${r.statusText}`
      );
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
    setReplyText(null);
    setFbMsg(null);
    setFbDone(false);
    setShowDownBox(false);
    setDownComment("");
    setLastPrompt(text);

    try {
      const resp = await askLangflow(text);
      const extracted = extractFirstMessageText(resp);
      setReplyText(extracted || "(No reply text found in response.)");
    } catch (e: any) {
      setErr(e.message || "Langflow request failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(kind: "up" | "down", comment?: string) {
    if (!replyText && !lastPrompt) {
      setFbMsg("No message to rate.");
      return;
    }
    setFbSending(true);
    setFbMsg(null);

    try {
      await fetch(`${BACKEND}/api/langflow/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          comment: (comment || "").trim(),
          session_id: "user_123",
          last_prompt: lastPrompt,
          last_reply: replyText,
        }),
      }).catch(() => {
        // If the route doesn't exist yet locally, don't break the UX
      });
      setFbDone(true);
      setFbMsg("Thanks!");
      setShowDownBox(false);
      setDownComment("");
    } catch (e: any) {
      setFbMsg("Could not send feedback; noted locally.");
    } finally {
      setFbSending(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">AI Chat Assistant</h2>

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

      {replyText && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <p className="whitespace-pre-wrap text-sm">{replyText}</p>

          {/* Feedback row */}
          <div className="mt-3 flex items-center gap-2">
            {fbDone ? (
              <span className="text-green-700 text-sm">{fbMsg || "Thanks!"}</span>
            ) : (
              <>
                <button
                  onClick={() => sendFeedback("up")}
                  disabled={fbSending}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                  title="Thumbs up"
                >
                  👍
                </button>
                <button
                  onClick={() => setShowDownBox((s) => !s)}
                  disabled={fbSending}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                  title="Thumbs down"
                >
                  👎
                </button>
                {fbMsg && <span className="text-sm text-gray-700">{fbMsg}</span>}
              </>
            )}
          </div>

          {/* Optional comment box for thumbs down */}
          {showDownBox && !fbDone && (
            <div className="mt-2">
              <textarea
                value={downComment}
                onChange={(e) => setDownComment(e.target.value)}
                placeholder="What went wrong?"
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
              <div className="mt-2">
                <button
                  onClick={() => sendFeedback("down", downComment)}
                  disabled={fbSending || !downComment.trim()}
                  className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-black disabled:opacity-60"
                >
                  Submit feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
