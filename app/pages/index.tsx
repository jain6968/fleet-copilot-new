// pages/index.tsx
import { useState } from "react";
import dynamic from 'next/dynamic';


/* ---------- Types ---------- */
type Repair = { id?: string; name?: string; date?: string | null };
type Evidence = {
  id?: string;
  type?: string;
  title?: string;
  summary?: string;
  lastAction?: string;
  lastActionBy?: string;
  lastActionAt?: string;
  status?: "accepted" | "rejected" | string;
  rejectionComment?: string;
};
type Diagnosis = { title: string; confidence?: number; summary?: string; nextSteps?: string[] };
type Vehicle = { vin: string; make?: string; model?: string; year?: number; miles?: number; licensePlate?: string; vehicleType?: string; repairs?: Repair[] };
type DetailResponse = {
  vehicle?: Vehicle;
  operator?: { name?: string; city?: string; postcode?: string } | null;
  currentDTC?: string | null;
  diagnosis?: Diagnosis | null;
  dtcs?: { code?: string; description?: string }[];
  evidences?: Evidence[];
};

const LangflowChatPanel = dynamic(
  () => import("../components/LangflowChatPanel"), // adjust the path if needed
  { ssr: false }
);

/* ---------- Env ---------- */
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:4000";

/* ---------- Helpers ---------- */
const looksLikeVIN = (s: string) => /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(s);

/* ---------- Evidence Row Component ---------- */
function EvidenceRow({
  ev,
  onPatched,
}: {
  ev: Evidence;
  onPatched: (patch: Partial<Evidence> & { id?: string }) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!ev.id) return setMsg("Missing evidence id");
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`${BACKEND}/api/evidence/${encodeURIComponent(ev.id)}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ by: "ui" }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg("thanks"); // as requested
        onPatched({ id: ev.id, status: "accepted", lastAction: "accepted" });
      } else {
        setMsg(j?.error || "Failed to accept");
      }
    } catch (e: any) {
      setMsg(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  };

  const submitReject = async () => {
    if (!ev.id) return setMsg("Missing evidence id");
    if (!comment.trim()) return setMsg("Please enter a comment");
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`${BACKEND}/api/evidence/${encodeURIComponent(ev.id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ by: "ui", comment }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg("Saved");
        onPatched({ id: ev.id, status: "rejected", lastAction: "rejected", rejectionComment: comment });
        setShowReject(false);
        setComment("");
      } else {
        setMsg(j?.error || "Failed to reject");
      }
    } catch (e: any) {
      setMsg(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
      <div><b>{ev.title || ev.type || ev.id}</b></div>
      <div style={{ color: "#555" }}>{ev.summary || "—"}</div>
      <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
        {ev.status ? <>Status: <b>{ev.status}</b></> : null}
        {ev.rejectionComment ? <> &nbsp;•&nbsp; Comment: {ev.rejectionComment}</> : null}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={accept} disabled={busy} style={{ padding: "6px 10px" }}>Accept</button>
        <button onClick={() => setShowReject(s => !s)} disabled={busy} style={{ padding: "6px 10px" }}>
          {showReject ? "Cancel" : "Reject"}
        </button>
      </div>

      {showReject && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter rejection comment…"
            rows={3}
            style={{ width: "100%", padding: 8 }}
          />
          <div style={{ marginTop: 6 }}>
            <button onClick={submitReject} disabled={busy || !comment.trim()} style={{ padding: "6px 10px" }}>
              Submit rejection
            </button>
          </div>
        </div>
      )}

      {msg && <div style={{ marginTop: 6, color: msg === "thanks" || msg === "Saved" ? "#0a0" : "#b00" }}>{msg}</div>}
    </li>
  );
}

/* ---------- Main page ---------- */
export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patchEvidenceInState = (patch: Partial<Evidence> & { id?: string }) => {
    setData((prev) => {
      if (!prev) return prev;
      const arr = prev.evidences ? [...prev.evidences] : [];
      const idx = arr.findIndex((e) => e.id && e.id === patch.id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, evidences: arr };
    });
  };

  async function runSearch(q: string) {
    setLoading(true);
    setErr(null);
    try {
      if (looksLikeVIN(q)) {
        const resp = await fetch(`${BACKEND}/api/vehicle/${encodeURIComponent(q)}`);
        if (resp.ok) setData(await resp.json());
      }
      const sr = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(q)}`);
      const sData = sr.ok ? await sr.json() : { results: [] };
      setResults(sData.results || []);
      if (!looksLikeVIN(q)) {
        const v = (sData.results || []).find((r: any) => r.type === "vehicle" && r.vin);
        if (v?.vin) {
          const vr = await fetch(`${BACKEND}/api/vehicle/${encodeURIComponent(v.vin)}`);
          if (vr.ok) setData(await vr.json());
          else setData(null);
        } else {
          setData(null);
        }
      }
    } catch (e: any) {
      setErr(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Fleet Dashboard</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query.trim());
        }}
        style={{ marginBottom: 16 }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search VIN, plate, make/model…"
          style={{ padding: 8, width: 420 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Search</button>
      </form>

      {loading && <div>Searching…</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      {/* 3-column layout */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Vehicle Overview */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3><b>Vehicle Overview</b></h3>
          {data?.vehicle ? (
            <>
              <div><b>VIN:</b> {data.vehicle.vin}</div>
              <div><b>Model:</b> {data.vehicle.make} {data.vehicle.model} {data.vehicle.year}</div>
              <div><b>Plate:</b> {data.vehicle.licensePlate || "—"}</div>
              <div><b>Miles:</b> {data.vehicle.miles ?? "—"}</div>
              <div><b>Repairs:</b> {data.vehicle.repairs?.length ?? 0}</div>
              <div>{data.diagnosis.title}</div>
            </>
          ) : (
            <div>No vehicle selected.</div>
          )}
        </div>

        {/* AIDiagnostics */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3><b>Diagnosis</b></h3>
          {data?.diagnosis ? (
            <>
              <div>{data.diagnosis.title}</div>
              <div>{data.diagnosis.summary}</div>
            </>
          ) : (
            <div>No diagnostics.</div>
          )}
          <div style={{ marginBottom: 20 }}></div>
          <h3><b>Evidence</b></h3>
          {data?.evidences?.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.evidences.map((e) => (
                <EvidenceRow key={e.id || Math.random()} ev={e} onPatched={patchEvidenceInState} />
              ))}
            </ul>
          ) : (
            <div>No evidence.</div>
          )}

        </div>

        {/* Evidence (with Accept/Reject) */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          {data?.diagnosis ? (
            <>
              <div><h4><b>Suggested Next Steps</b></h4></div>
              {data.diagnosis.nextSteps?.length ? (
                <ul>
                  {data.diagnosis.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : null}
            </>
          ) : (
            <div>No diagnostics.</div>
          )}
          <div style={{ marginBottom: 20 }}></div>
            <LangflowChatPanel />
        </div>

      </section>

    </main>
  );
}
