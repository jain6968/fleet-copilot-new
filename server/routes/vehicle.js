import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

router.get("/:vin", async (req, res) => {
  try {
    const vin = req.params.vin.toString().trim();

    // One-statement, Aura-safe query:
    // - Returns a single "current" DTC (if present) and its evidences
    // - Projects repairs as an array of maps
    const cypher = `
      MATCH (v:Vehicle {vin:$vin})
      OPTIONAL MATCH (v)-[:HAS_REPAIR]->(r:Repair)
      WITH v, collect(DISTINCT {id:r.id, name:r.name, date:r.date}) AS repairs

      OPTIONAL MATCH (v)-[:HAS_DTC]->(d:DTC)
      WITH v, repairs, d
      ORDER BY d.code ASC
      WITH v, repairs, head(collect(d)) AS curDtc

      OPTIONAL MATCH (curDtc)-[:HAS_EVIDENCE]->(e:Evidence)
      WITH v, repairs, curDtc,
           collect(DISTINCT {id:e.id, type:e.type, title:e.title, summary:e.summary}) AS evidences
      RETURN v{.*, repairs:repairs} AS vehicle,
             curDtc.code AS currentDTC,
             evidences
    `;

    const row = (await runQuery(cypher, { vin }))[0] || {};
    const vehicle = row?.vehicle || null;
    const currentDTC = row?.currentDTC || null;
    const evidences = row?.evidences || [];

    // Simple demo diagnosis (expand with your rules/RAG later)
    let diagnosis = null;
    if (currentDTC === "P20EE") {
      diagnosis = {
        title: "NOx Sensor Failure",
        confidence: 0.82,
        summary:
          "Abnormal NOx readings combined with DTC P20EE suggest the NOx sensor is likely failing.",
        nextSteps: ["Run NOx sensor self-test", "Inspect NOx sensor wiring"]
      };
    }

    res.json({ vehicle, currentDTC, diagnosis, evidences });
  } catch (err) {
    console.error("[vehicle] error:", err);
    res.status(500).json({ error: "Vehicle lookup failed", detail: String(err) });
  }
});

export default router;
