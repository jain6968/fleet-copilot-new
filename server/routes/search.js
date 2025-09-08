import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json({ results: [] });

    const cypher = `
      CALL {
        MATCH (v:Vehicle)
        WHERE v.vin STARTS WITH $q OR toLower(v.licensePlate) CONTAINS toLower($q)
        RETURN {type:'vehicle', vin:v.vin, make:v.make, model:v.model, year:v.year} AS item

        UNION

        MATCH (p:Part)
        WHERE toLower(p.number) CONTAINS toLower($q) OR toLower(p.name) CONTAINS toLower($q)
        RETURN {type:'part', number:p.number, name:p.name} AS item

        UNION

        MATCH (j:Job)
        WHERE j.jobId STARTS WITH $q
        RETURN {type:'job', jobId:j.jobId, status:j.status} AS item
      }
      RETURN item
      LIMIT 25
    `;

    const rows = await runQuery(cypher, { q });
    res.json({ results: rows.map(r => r.item) });
  } catch (err) {
    console.error("[search] error:", err);
    res.status(500).json({ error: "Search failed", detail: String(err) });
  }
});

export default router;