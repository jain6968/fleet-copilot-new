import { useSession } from "next-auth/react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import axios from "axios";
import { useEffect, useState } from "react";
// If you re-enable Langflow, import dynamically with ssr:false to avoid hydration issues:
// import dynamic from "next/dynamic";
// const LangflowChatPanel = dynamic(() => import("../components/LangflowChatPanel"), { ssr: false });

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:4000";

export default function Home() {
  const { data: session, status } = useSession();

  // ---- state ----
  const [q, setQ] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [searchResults, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // read ?q= from URL on mount (optional)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const query = url.searchParams.get("q") || "";
    setQ(query);
  }, []);

  // run search when q changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        if (!q) {
          setResults([]);
          setData(null);
          return;
        }

        const s = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(q)}`);
        if (!s.ok) throw new Error(`${s.status} ${s.statusText}`);
        const sData = await s.json();

        if (cancelled) return;
        setResults(sData.results || []);

        const v = (sData.results || []).find((r: any) => r.type === "vehicle");
        if (v?.vin) {
          const vr = await fetch(`${BACKEND}/api/vehicle/${v.vin}`);
          if (!vr.ok) throw new Error(`${vr.status} ${vr.statusText}`);
          const vrData = await vr.json();
          if (!cancelled) setData(vrData);
        } else {
          setData(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Search failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (status === "loading") return null;
  if (!session)
    return (
      <div className="min-h-screen grid place-items-center">
        <a className="px-4 py-2 bg-blue-600 text-white rounded" href="/login">
          Sign in
        </a>
      </div>
    );

  const vehicle = data?.vehicle;

  return (
    <Layout>
      {/* Top search bar + error */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search VIN / make / model"
          className="px-3 py-2 border rounded w-80"
        />
        <button
          onClick={() => {
            // typing already updates q and triggers the effect
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Search
        </button>
        {error && (
          <span className="ml-3 text-sm text-red-600">
            {error}
          </span>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Sidebar: Vehicle Overview */}
        <div className="lg:col-span-1">
          <Card title="Vehicle Overview">
            {vehicle ? (
              <div className="space-y-2 text-sm">
                <div>
                  <b>VIN:</b> {vehicle.vin}
                </div>
                <div>
                  {vehicle.make} {vehicle.model}
                </div>
                <div>{vehicle.year}</div>
                <div>{vehicle.miles?.toLocaleString()} miles</div>
                <div className="mt-4">
                  <b>Current DTC</b>
                  <div className="flex items-center gap-2 mt-1">
                    <span>!</span>
                    <span>{data?.currentDTC || "—"}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <b>History</b>
                  <ul className="list-disc ml-5">
                    {(vehicle.repairs || []).slice(0, 3).map((r: any) => (
                      <li key={r.id}>
                        {r.name} <span className="text-gray-500">({r.date})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Search to load a vehicle…</div>
            )}
          </Card>

          {/* If you want the Langflow chat here, re-enable with dynamic import */}
          {/* <div className="mt-8">
            <LangflowChatPanel />
          </div> */}
        </div>

        {/* Center Content: Evidences */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {(data?.evidences || []).map((e: any) => (
              <Card key={e.id} title={`${e.title}`}>
                <p className="text-sm mb-3">{e.summary}</p>
                <div className="flex gap-2">
                  <a
                    className="px-3 py-1 border rounded"
                    href="#"
                    onClick={(ev) => {
                      ev.preventDefault();
                      alert("Open evidence viewer TBD");
                    }}
                  >
                    View Evidence
                  </a>
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded"
                    onClick={async () => {
                      await axios.post(`${BACKEND}/api/evidence/${e.id}/action`, {
                        action: "accept",
                        user: (session?.user as any)?.email,
                      });
                      alert("Accepted");
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-200 rounded"
                    onClick={async () => {
                      await axios.post(`${BACKEND}/api/evidence/${e.id}/action`, {
                        action: "reject",
                        user: (session?.user as any)?.email,
                      });
                      alert("Rejected");
                    }}
                  >
                    Reject
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Sidebar: AI Diagnostics */}
        <div className="lg:col-span-1">
          <Card title="AI Diagnostics">
            {data?.diagnosis ? (
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-semibold">{data.diagnosis.title}</h4>
                  <span className="text-sm">shield</span>
                </div>
                <div className="w-full bg-gray-200 rounded mt-2">
                  <div
                    className="h-3 bg-gray-600 rounded"
                    style={{ width: `${Math.round(data.diagnosis.confidence * 100)}%` }}
                  />
                </div>
                <p className="text-sm mt-2">{data.diagnosis.summary}</p>
                <div className="mt-3">
                  <b>Suggested Next Steps</b>
                  <ul className="list-disc ml-5 text-sm">
                    {data.diagnosis.nextSteps.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No diagnosis yet.</div>
            )}
          </Card>
        </div>
      </div>

      {q && (
        <div className="mt-8">
          <h3 className="text-sm text-gray-600 mb-2">Search results for "{q}"</h3>
          <pre className="text-xs bg-white p-3 rounded border overflow-auto">
            {JSON.stringify(searchResults, null, 2)}
          </pre>
        </div>
      )}
    </Layout>
  );
}

export async function getServerSideProps(ctx: any) {
  const { getSession } = await import("next-auth/react");
  const session = await getSession(ctx);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: { session } };
}
