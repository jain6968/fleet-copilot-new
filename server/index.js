// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import search from "./routes/search.js";
import vehicle from "./routes/vehicle.js";
import evidence from "./routes/evidence.js";
import { driver } from "./neo4j.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Minimal health
app.get("/health", (_req, res) => res.json({ ok: true }));

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

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
