// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import search from "./routes/search.js";
import vehicle from "./routes/vehicle.js";
import evidence from "./routes/evidence.js";
import { driver } from "./neo4j.js";
import { searchHandler } from "./routes/search.js";

app.get("/api/search", searchHandler);
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const list = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// 2) CORS options with whitelist
const corsOptions = {
  origin(origin, cb) {
    // allow non-browser clients with no Origin (curl/Postman)
    if (!origin) return cb(null, true);
    const ok = list.includes(origin);
    cb(ok ? null : new Error(`CORS: origin not allowed: ${origin}`), ok);
  },
  credentials: true
};


// 6) Centralized error handler that STILL sends CORS
app.use((err, req, res, next) => {
  // echo the allowed origin so the browser can see the error
  const origin = req.headers.origin;
  if (origin && list.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  // send normalized JSON error
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
    detail: process.env.NODE_ENV === "production" ? undefined : String(err?.stack || err)
  });
});

// 4) Apply CORS globally, before JSON parser and routes
app.use(cors(corsOptions));
app.use(express.json());

// 5) Handle preflight for all routes
app.options("*", cors(corsOptions), (req, res) => res.sendStatus(200));

// ---- your routes below ----
app.get("/health", (req, res) => res.status(200).send("ok"));

// ... your routes ...
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

dotenv.config();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

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
