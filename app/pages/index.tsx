import { getSession, useSession } from "next-auth/react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import axios from "axios";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
//const LangflowChatPanel = dynamic(() => import("../components/LangflowChat"), {
//  ssr: false,
//});
const BACKEND = process.env.NEXT_PUBLIC_BACKEND || process.env.BACKEND_BASE_URL || "http://localhost:4000";

export default function Home(){
  const { data: session, status } = useSession();
  const [q, setQ] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [searchResults, setResults] = useState<any[]>([]);

  // read ?q= from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const query = url.searchParams.get("q") || "";
    setQ(query);
  }, []);
  
  // run search when q changes
  useEffect(() => {
    if (!q) return;

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(
          `${BACKEND}/api/search?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) setResults(data.results || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Search failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q]);

  
  if (status === "loading") return null;
  if (!session) return (
    <div className="min-h-screen grid place-items-center">
      <a className="px-4 py-2 bg-blue-600 text-white rounded" href="/login">Sign in</a>
    </div>
  );

  const vehicle = data?.vehicle;

async function runSearch(q: string) {
  const res = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(q)}`, {
    // do NOT include credentials unless you really need cookies
    // credentials: "include"
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

  // usage
  <button onClick={async () => {
    try {
      const data = await runSearch(q);
      setResults(data.results || []);
    } catch (e) { /* handle */ }
  }}>
    Search
  </button>


  return (
  <Layout>

  <div className="mb-4 flex flex-wrap items-center gap-2">
    <input
      value={q ?? ""}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Search VIN / make / model"
      className="px-3 py-2 border rounded w-80"
    />
    <button
      onClick={() => {
        // no-op: typing already sets q and triggers your useEffect
        // keep this button for UX; optional manual trigger if you move fetch to a click handler
      }}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Search
    </button>

    {/* optional: error banner */}
    {console.error && (
      <span className="ml-3 text-sm text-red-600">
        {String(console.error)}
      </span>
    )}
  </div>

  {/* your existing grid starts here */}
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
    {/* Left Sidebar */}
    <div className="lg:col-span-1">
      <Card title="Vehicle Overview">
        {vehicle ? (
          <div className="space-y-2 text-sm">
            <div><b>VIN:</b> {vehicle.vin}</div>
            <div>{vehicle.make} {vehicle.model}</div>
            <div>{vehicle.year}</div>
            <div>{vehicle.miles?.toLocaleString()} miles</div>
            <div className="mt-4">
              <b>Current DTC</b>
              <div className="flex items-center gap-2 mt-1">
                <span>!</span><span>{data?.currentDTC || "—"}</span>
              </div>
            </div>
            <div className="mt-4">
              <b>History</b>
              <ul className="list-disc ml-5">
                {(vehicle.repairs || []).slice(0,3).map((r:any) => (
                  <li key={r.id}>{r.name} <span className="text-gray-500">({r.date})</span></li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Search to load a vehicle…</div>
        )}
      </Card>
      <div className="mt-8">
        
      </div>
    </div>

    {/* Center Content: Evidences */}
    <div className="lg:col-span-3 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {(data?.evidences || []).map((e:any) => (
          <Card key={e.id} title={`${e.title}`}>
            <p className="text-sm mb-3">{e.summary}</p>
            <div className="flex gap-2">
              <a className="px-3 py-1 border rounded" href="#" onClick={(ev)=>{ev.preventDefault(); alert("Open evidence viewer TBD");}}>View Evidence</a>
              <button className="px-3 py-1 bg-green-600 text-white rounded"
                onClick={async()=>{ await axios.post(`${BACKEND}/api/evidence/${e.id}/action`, { action: "accept", user: session?.user?.email }); alert("Accepted"); }}>
                Accept
              </button>
              <button className="px-3 py-1 bg-gray-200 rounded"
                onClick={async()=>{ await axios.post(`${BACKEND}/api/evidence/${e.id}/action`, { action: "reject", user: session?.user?.email }); alert("Rejected"); }}>
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
              <div className="h-3 bg-gray-600 rounded" style={{ width: `${Math.round(data.diagnosis.confidence*100)}%` }} />
            </div>
            <p className="text-sm mt-2">{data.diagnosis.summary}</p>
            <div className="mt-3">
              <b>Suggested Next Steps</b>
              <ul className="list-disc ml-5 text-sm">
                {data.diagnosis.nextSteps.map((s:string,i:number) => (<li key={i}>{s}</li>))}
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
      <pre className="text-xs bg-white p-3 rounded border overflow-auto">{JSON.stringify(searchResults, null, 2)}</pre>
    </div>
  )}
  </Layout>
  );
}

export async function getServerSideProps(ctx:any){
  const { getSession } = await import("next-auth/react");
  const session = await getSession(ctx);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: { session } };
}
function setError(arg0: null) {
  throw new Error("Function not implemented.");
}

