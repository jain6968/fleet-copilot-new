"use client";

import * as React from "react";

// Determine backend URL (Render/Vercel or local)
const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:4000";

/** Extract DTCs from any OCR/raw text (captures P3348, P242F, 01304, etc.) */
function extractAllDtcs(text: string): string[] {
  const normalized = (text || "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  // OBD-ish: P/B/C/U + 0-3 + 3 hex-ish chars (so P242F works)
  const obd = normalized.match(/\b[PBUC][0-3][0-9A-F]{3}\b/gi) || [];
  // VAG-ish / generic 5-digit codes like 01304
  const vag = normalized.match(/\b0\d{4}\b/g) || [];

  // de-dupe preserving order
  const seen = new Set<string>();
  const all = [...obd, ...vag]
    .map((x) => x.toUpperCase())
    .filter((x) => {
      if (seen.has(x)) return false;
      seen.add(x);
      return true;
    });

  return all;
}

export default function LangflowChatPanel() {
  const [msg, setMsg] = React.useState("");
  const [replyText, setReplyText] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // feedback UI state
  const [fbSending, setFbSending] = React.useState(false);
  const [fbMsg, setFbMsg] = React.useState<string | null>(null);
  const [fbDone, setFbDone] = React.useState(false);
  const [showDownBox, setShowDownBox] = React.useState(false);
  const [downComment, setDownComment] = React.useState("");

  // image upload state
  const [imgBusy, setImgBusy] = React.useState(false);
  const [imgErr, setImgErr] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  /** Call backend proxy route -> server/routes/langflow.js */
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
      throw new Error(body?.error || `${r.status} ${r.statusText}`);
    }

    const data = await r.json();
    return data.reply || "No reply text found in response.";
  }

  /** Handle Send button click */
  async function onSend() {
    const text = msg.trim();
    if (!text) {
      setErr("Please type a message first.");
      return;
    }

    setErr(null);
    setLoading(true);
    setReplyText(null);
    setFbDone(false);
    setFbMsg(null);

    try {
      const reply = await askLangflow(text);
      setReplyText(reply);
    } catch (e: any) {
      setErr(e.message || "Langflow request failed");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Upload image -> backend OCR -> extract ALL fault codes -> prefill message box
   *
   * Backend expectation (recommended):
   * POST ${BACKEND}/api/vision/ocr  (multipart/form-data "image")
   * returns: { text: "raw ocr text..." }  OR  { text: "...", codes: ["P3348","P242F"] }
   */
  async function onPickImage(file: File) {
    setImgErr(null);
    setImgBusy(true);

    try {
      const form = new FormData();
      form.append("image", file);

      const r = await fetch(`${BACKEND}/api/vision/ocr`, {
        method: "POST",
        body: form,
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `OCR failed: ${r.status}`);
      }

      // support either JSON or plain text from backend
      const ct = r.headers.get("content-type") || "";
      let rawText = "";
      let codesFromApi: string[] | null = null;

      if (ct.includes("application/json")) {
        const j = await r.json();
        rawText = (j?.text || j?.raw || "").toString();
        if (Array.isArray(j?.codes)) codesFromApi = j.codes.map((c: any) => String(c));
      } else {
        rawText = await r.text();
      }

      const codes = (codesFromApi && codesFromApi.length ? codesFromApi : extractAllDtcs(rawText)).map((c) =>
        c.toUpperCase()
      );

      if (!codes.length) {
        setImgErr("I couldn’t detect any fault codes in that image. Try a clearer photo (less glare) or closer zoom.");
        return;
      }

      const prompt = `Do you want me to analyse the fault codes shown in the image: ${codes.join(
        ", "
      )}? Please explain the likely cause and recommended next steps.`;

      setMsg(prompt);
    } catch (e: any) {
      setImgErr(e?.message || "Image processing failed");
    } finally {
      setImgBusy(false);
      // allow re-selecting the same file
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Handle thumbs up / down feedback (dummy or future extension) */
  async function sendFeedback(kind: "up" | "down", comment?: string) {
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
          last_reply: replyText,
        }),
      }).catch(() => {
        // silently ignore if route doesn't exist
      });

      setFbDone(true);
      setFbMsg("Thanks!");
      setShowDownBox(false);
      setDownComment("");
    } catch {
      setFbMsg("Could not send feedback; noted locally.");
    } finally {
      setFbSending(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">AI Chat Assistant</h2>
      <p className="text-sm text-gray-600 mb-3">
        Ask me anything about diagnostics, maintenance, or vehicle analytics.
      </p>

      {/* Image upload */}
      <div className="mb-3 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
          }}
          className="block text-sm"
        />
        {imgBusy && <span className="text-sm text-gray-600">Reading image…</span>}
      </div>
      {imgErr && <p className="text-red-600 -mt-1 mb-2 text-sm">{imgErr}</p>}

      {/* Message input */}
      <div className="flex gap-2">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 border rounded px-3 py-2 min-h-[80px] resize-y"
          rows={4}
        />
        <button
          onClick={onSend}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Error message */}
      {err && <p className="text-red-600 mt-2 text-sm">{err}</p>}

      {/* Chat response */}
      {replyText && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <p className="whitespace-pre-wrap text-sm">{replyText}</p>

          {/* Feedback section */}
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

          {/* Downvote comment box */}
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
