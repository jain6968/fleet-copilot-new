// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import search from "./routes/search.js";
import vehicle from "./routes/vehicle.js";
import evidence from "./routes/evidence.js";
import { driver } from "./neo4j.js";

const app = express();
const PORT = process.env.PORT || 4000;
const allowList = [
  "http://localhost:3000",
  "https://fleet-copilot-new.vercel.app",
  // add preview domains if you use them, e.g.:
  // "https://fleet-copilot-new-git-*.vercel.app"
];

const corsOptions = {
  origin(origin, cb) {
    // allow non-browser requests (curl/Postman) with no Origin
    if (!origin) return cb(null, true);
    const ok = allowList.some((o) =>
      o.includes("*")
        ? new RegExp("^" + o.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$").test(origin)
        : o === origin
    );
    cb(ok ? null : new Error("CORS: origin not allowed"), ok);
  },
  credentials: true,
};

app.use((req, res, next) => {
  // help caches differentiate per-Origin
  res.setHeader("Vary", "Origin");
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

// ... your routes ...
app.listen(PORT, () => console.log(`Backend on ${PORT}`));

dotenv.config();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).send("ok"));

// Debug: show which DB we're pointing at + simple count
app.get("/api/debug/where", async (_req, res) => {
  try {
    const session = driver.session();
    const [{ _fields: [count] }] = await session.run("MATCH (v:Vehicle) RETURN count(v) AS c").then(r => r.records);
    await session.close();
    res.json({
      uri: process.env.NEO4J_URI,
      vehicleCount: count.toInt ? count.toInt() : count
    });
  } catch (e) {
    res.status(500).json({ error: String(e), uri: process.env.NEO4J_URI });
  }
});

app.use("/api/search", search);
app.use("/api/vehicle", vehicle);
app.use("/api/evidence", evidence);


app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

// Non‑blocking connectivity check with retry
(async function checkNeo4j() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await driver.verifyConnectivity();
      console.log(`[Neo4j] Connected to ${process.env.NEO4J_URI}`);
      return;
    } catch (err) {
      console.warn(`[Neo4j] Connectivity attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt === maxAttempts) {
        console.error("[Neo4j] Giving up after max attempts. API will still run; requests may fail until env/DB are fixed.");
        return;
      }
      await new Promise(r => setTimeout(r, 1500 * attempt)); // backoff
    }
  }
})();

process.on("SIGINT", async () => {
  await driver.close();
  process.exit(0);
});
