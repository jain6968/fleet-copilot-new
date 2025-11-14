// pages/index.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import MaintenanceHistorySection, {
  MaintenanceItem,
} from "../components/MaintenanceHistory";

/* ---------- Types ---------- */
type Repair = { id?: string; name?: string; date?: string | null };

type Evidence = {
  id: string;
  reason?: string;
};

type Diagnosis = {
  title: string;
  confidence?: number;
  summary?: string;
  nextSteps?: string[];
};

type Vehicle = {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  miles?: number;
  licensePlate?: string;
  vehicleType?: string;
  repairs?: Repair[];
};

type DetailResponse = {
  maintenanceHistory: MaintenanceItem[];
  vehicle?: Vehicle;
  operator?: { name?: string; city?: string; postcode?: string } | null;
  currentDTC?: string | null;
  diagnosis?: Diagnosis | null;
  dtcs?: { code?: string; description?: string }[];
  evidences?: Evidence[];
};

const LangflowChatPanel = dynamic(
  () => import("../components/LangflowChatPanel"),
  { ssr: false }
);

/* ---------- Env ---------- */
const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:4000";

/* ---------- Helpers ---------- */
const looksLikeVIN = (s: string) => /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(s);

/* ---------- Evidence Row ---------- */
function EvidenceRow({ ev }: { ev: Evidence }) {
  const reason =
    (ev as any).reason ??
    (ev as any).summary ??
    (ev as any).title ??
    "Reason not provided";

  return (
    <li
      style={{
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: "1px solid #eee",
      }}
    >
      <div style={{ fontWeight: 500, color: "#333" }}>{reason}</div>
    </li>
  );
}

/* ---------- Collapsible Evidence Section ---------- */
function EvidenceSection({ evidences }: { evidences: Evidence[] }) {
  const [open, setOpen] = useState(false);
  const maxPreview = 2;

  const hasMore = evidences?.length > maxPreview;
  const shown = open ? evidences : evidences?.slice(0, maxPreview);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <button
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-controls="evidence-panel"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <h3 style={{ margin: 0 }}>Evidence ({evidences?.length ?? 0})</h3>
        <span
          style={{
            transition: "transform 150ms",
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </button>

      <div id="evidence-panel" style={{ marginTop: 10, display: "block" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {shown?.map((e) => (
            <EvidenceRow key={e.id || Math.random()} ev={e} />
          ))}
        </ul>

        {hasMore && (
          <div style={{ display: "flex", gap: 8 }}>
            {!open ? (
              <button
                onClick={() => setOpen(true)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fafafa",
                }}
              >
                Show {evidences.length - maxPreview} more
              </button>
            ) : (
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fafafa",
                }}
              >
                Show less
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function Home() {
  const router = useRouter();

  // 🔒 AUTH + ALL HOOKS AT TOP
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const [dxBusy, setDxBusy] = useState(false);
  const [dxMsg, setDxMsg] = useState<string | null>(null);
  const [dxRejectOpen, setDxRejectOpen] = useState(false);
  const [dxComment, setDxComment] = useState("");

  const [query, setQuery] = useState("");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // (optional helper, even if unused right now)
  const patchEvidenceInState = (patch: Partial<Evidence> & { id?: string }) => {
    setData((prev) => {
      if (!prev) return prev;
      const arr = prev.evidences ? [...prev.evidences] : [];
      const idx = arr.findIndex((e) => e.id && e.id === patch.id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, evidences: arr };
    });
  };

  // 🔐 AUTH CHECK EFFECT
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasLocal = localStorage.getItem("fleet_auth") === "yes";
    const hasCookie = document.cookie.includes("fleet_auth=yes");

    if (hasLocal || hasCookie) {
      setIsAuthed(true);
      setCheckedAuth(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Gate UI until auth is checked
  if (!checkedAuth || !isAuthed) {
    return <main style={{ padding: 24 }}>Checking access…</main>;
  }

  async function acceptAllEvidence() {
    if (!data?.evidences?.length) {
      setDxMsg("No evidence to accept.");
      return;
    }
    setDxBusy(true);
    setDxMsg(null);
    try {
      const updates = await Promise.all(
        data.evidences.map(async (ev) => {
          if (!ev.id) return null;
          const r = await fetch(
            `${BACKEND}/api/evidence/${encodeURIComponent(ev.id)}/accept`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ by: "ui" }),
            }
          );
          const j = await r.json().catch(() => ({}));
          if (!r.ok)
            throw new Error(j?.error || `Failed to accept ${ev.id}`);
          return (
            j?.evidence || {
              id: ev.id,
              status: "accepted",
              lastAction: "accepted",
            }
          );
        })
      );

      setData((prev) => {
        if (!prev) return prev;
        const map = new Map(
          (updates.filter(Boolean) as Evidence[]).map((e) => [e.id, e])
        );
        const newEvs = (prev.evidences || []).map((e) =>
          map.get(e.id!) ? { ...e, ...map.get(e.id!) } : e
        );
        return { ...prev, evidences: newEvs };
      });

      setDxMsg("thanks");
      setDxRejectOpen(false);
      setDxComment("");
    } catch (e: any) {
      setDxMsg(e?.message || "Accept failed");
    } finally {
      setDxBusy(false);
    }
  }

  async function rejectAllEvidence() {
    if (!data?.evidences?.length) {
      setDxMsg("No evidence to reject.");
      return;
    }
    if (!dxComment.trim()) {
      setDxMsg("Please enter a comment");
      return;
    }
    setDxBusy(true);
    setDxMsg(null);
    try {
      const updates = await Promise.all(
        data.evidences.map(async (ev) => {
          if (!ev.id) return null;
          const r = await fetch(
            `${BACKEND}/api/evidence/${encodeURIComponent(ev.id)}/reject`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ by: "ui", comment: dxComment }),
            }
          );
          const j = await r.json().catch(() => ({}));
          if (!r.ok)
            throw new Error(j?.error || `Failed to reject ${ev.id}`);
          return (
            j?.evidence || {
              id: ev.id,
              status: "rejected",
              lastAction: "rejected",
              rejectionComment: dxComment,
            }
          );
        })
      );

      setData((prev) => {
        if (!prev) return prev;
        const map = new Map(
          (updates.filter(Boolean) as Evidence[]).map((e) => [e.id, e])
        );
        const newEvs = (prev.evidences || []).map((e) =>
          map.get(e.id!) ? { ...e, ...map.get(e.id!) } : e
        );
        return { ...prev, evidences: newEvs };
      });

      setDxMsg("Saved");
      setDxRejectOpen(false);
      setDxComment("");
    } catch (e: any) {
      setDxMsg(e?.message || "Reject failed");
    } finally {
      setDxBusy(false);
    }
  }

  async function runSearch(q: string) {
    setLoading(true);
    setErr(null);
    try {
      if (looksLikeVIN(q)) {
        const resp = await fetch(
          `${BACKEND}/api/vehicle/${encodeURIComponent(q)}`
        );
        if (resp.ok) setData(await resp.json());
      }
      const sr = await fetch(
        `${BACKEND}/api/search?q=${encodeURIComponent(q)}`
      );
      const sData = sr.ok ? await sr.json() : { results: [] };
      setResults(sData.results || []);
      if (!looksLikeVIN(q)) {
        const v = (sData.results || []).find(
          (r: any) => r.type === "vehicle" && r.vin
        );
        if (v?.vin) {
          const vr = await fetch(
            `${BACKEND}/api/vehicle/${encodeURIComponent(v.vin)}`
          );
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
        <button type="submit" style={{ marginLeft: 8 }}>
          Search
        </button>
      </form>

      {loading && <div>Searching…</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      {/* 3-column layout */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        {/* Vehicle overview + maintenance */}
        <div className="space-y-4">
          <div className="border rounded-xl p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Vehicle Overview</h2>
            <div className="text-sm text-gray-700">
              <div>
                <b>VIN:</b> {data?.vehicle?.vin || "—"}
              </div>
              <div>
                <b>Make/Model:</b> {data?.vehicle?.make || "—"}{" "}
                {data?.vehicle?.model || ""}
              </div>
              <div>
                <b>Year:</b> {data?.vehicle?.year || "—"}
              </div>
              <div>
                <b>Miles:</b>{" "}
                {data?.vehicle?.miles?.toLocaleString?.() || "—"}
              </div>
              <div>
                <b>License Plate:</b> {data?.vehicle?.licensePlate || "—"}
              </div>
            </div>
          </div>

          <MaintenanceHistorySection
            items={(data?.maintenanceHistory as MaintenanceItem[]) || []}
            defaultOpen={true}
            maxPreview={3}
          />
        </div>

        {/* Diagnosis + evidence actions */}
        <div
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
        >
          <h3>
            <b>Diagnosis</b>
          </h3>
          {data?.diagnosis ? (
            <>
              <div>{data.diagnosis.title}</div>
              <div>{data.diagnosis.summary}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  onClick={acceptAllEvidence}
                  disabled={dxBusy}
                  style={{ padding: "6px 10px" }}
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    setDxRejectOpen((s) => !s);
                    setDxMsg(null);
                  }}
                  disabled={dxBusy}
                  style={{ padding: "6px 10px" }}
                >
                  {dxRejectOpen ? "Cancel" : "Reject"}
                </button>
              </div>

              {dxRejectOpen && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={dxComment}
                    onChange={(e) => setDxComment(e.target.value)}
                    placeholder="Enter rejection comment…"
                    rows={3}
                    style={{ width: "100%", padding: 8 }}
                  />
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={rejectAllEvidence}
                      disabled={dxBusy || !dxComment.trim()}
                      style={{ padding: "6px 10px" }}
                    >
                      Submit rejection
                    </button>
                  </div>
                </div>
              )}

              {dxMsg && (
                <div
                  style={{
                    marginTop: 6,
                    color:
                      dxMsg === "thanks" || dxMsg === "Saved" ? "#0a0" : "#b00",
                  }}
                >
                  {dxMsg}
                </div>
              )}
            </>
          ) : (
            <div>No diagnostics.</div>
          )}

          <div style={{ marginBottom: 20 }}></div>
          <h3>
            <b>Evidence</b>
          </h3>
          {data?.evidences?.length ? (
            <EvidenceSection evidences={data.evidences} />
          ) : (
            <div>No evidence.</div>
          )}
        </div>

        {/* Next steps + AI chat */}
        <div
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
        >
          {data?.diagnosis ? (
            <>
              <div>
                <h4>
                  <b>Suggested Next Steps</b>
                </h4>
              </div>
              {data.diagnosis.nextSteps?.length ? (
                <ul>
                  {data.diagnosis.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
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
