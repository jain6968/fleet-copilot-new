import { useState } from "react";

type Repair = { id?: string; name?: string; date?: string | null };
type Evidence = { id?: string; type?: string; title?: string; summary?: string; lastAction?: string; lastActionBy?: string; lastActionAt?: string };
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

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:4000";
const looksLikeVIN = (s: string) => /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(s);

export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function runSearch(q: string) {
    setLoading(true);
    setErr(null);

    try {
      // 1) Direct VIN details
      if (looksLikeVIN(q)) {
        const resp = await fetch(`${BACKEND}/api/vehicle/${encodeURIComponent(q)}`);
        if (resp.ok) setData(await resp.json());
      }

      // 2) Normal search (to fill list)
      const sr = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(q)}`);
      const sData = sr.ok ? await sr.json() : { results: [] };
      setResults(sData.results || []);

      // 3) Fallback to first vehicle hit for details
      if (!looksLikeVIN(q)) {
        const v = (sData.results || []).find((r: any) => r.type === "vehicle" && r.vin);
        if (v?.vin) {
          const vr = await fetch(`${BACKEND}/api/vehicle/${encodeURIComponent(v.vin)}`);
          if (vr.ok) setData(await vr.json());
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
      <h1>Fleet Search</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query.trim());
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search VIN, plate, make/model…"
          style={{ padding: 8, width: 420 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Search</button>
      </form>

      {loading && <div style={{ marginTop: 12 }}>Searching…</div>}
      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 24 }}>
        {/* Vehicle Overview */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>Vehicle Overview</h3>
          {data?.vehicle ? (
            <>
              <div><b>VIN:</b> {data.vehicle.vin}</div>
              <div><b>Model:</b> {data.vehicle.make} {data.vehicle.model} {data.vehicle.year}</div>
              <div><b>Plate:</b> {data.vehicle.licensePlate || "—"}</div>
              <div><b>Miles:</b> {data.vehicle.miles ?? "—"}</div>
              <div><b>Repairs:</b> {data.vehicle.repairs?.length ?? 0}</div>
            </>
          ) : (
            <div>No vehicle selected.</div>
          )}
        </div>

        {/* Evidence */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>Evidence</h3>
          {data?.evidences?.length ? (
            <ul>
              {data.evidences.map((e) => (
                <li key={e.id}>
                  <b>{e.title || e.type || e.id}</b> — {e.summary || "—"}
                </li>
              ))}
            </ul>
          ) : (
            <div>No evidence.</div>
          )}
        </div>

        {/* AI Diagnostics */}
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>AI Diagnostics</h3>
          {data?.diagnosis ? (
            <>
              <div><b>{data.diagnosis.title}</b></div>
              <div>{data.diagnosis.summary}</div>
              {data.diagnosis.nextSteps?.length ? (
                <ul>
                  {data.diagnosis.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : null}
            </>
          ) : (
            <div>No diagnostics.</div>
          )}
        </div>
      </section>

      {/* Search Results List */}
      <section style={{ marginTop: 24 }}>
        <h3>Results</h3>
        <ul>
          {results.map((r, i) => (
            <li key={i}>
              {r.type} — {r.vin || r.code || r.id || r.title}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
