import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import search from "./routes/search.js";     // default export Router
import vehicle from "./routes/vehicle.js";   // default export Router
import evidence from "./routes/evidence.js"; // default export Router
import { driver } from "./neo4j.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Make dotenv load server/.env regardless of where you start node from
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const app = express();
const allowList = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",").map(s=>s.trim()).filter(Boolean);

app.use((_, res, next) => { res.setHeader("Vary", "Origin"); next(); });
app.use(cors({
  origin(origin, cb){ if(!origin) return cb(null,true); cb(null, allowList.includes(origin)); },
  credentials: true
}));
app.options("*", cors());
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.use("/api/search", search);
app.use("/api/vehicle", vehicle);
app.use("/api/evidence", evidence);

app.use((err, req, res, _next) => {
  const origin = req.headers.origin;
  if (origin && allowList.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  console.error("[API error]", err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

(async () => {
  try { await driver.verifyConnectivity(); console.log(`[Neo4j] Connected to ${process.env.NEO4J_URI}`); }
  catch(e){ console.warn("[Neo4j] connectivity failed:", e.message); }
})();
