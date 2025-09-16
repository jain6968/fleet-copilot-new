import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

export async function searchHandler(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      const e = new Error("Missing q");
      e.status = 400;
      throw e;
    }

    // Example Cypher: adjust to your schema
    const cypher = `
      CALL {
        WITH $q AS q
        MATCH (v:Vehicle)
        WHERE toLower(v.vin) CONTAINS toLower(q)
           OR toLower(v.make) CONTAINS toLower(q)
           OR toLower(v.model) CONTAINS toLower(q)
        RETURN { type: "vehicle", vin: v.vin, make: v.make, model: v.model } AS item
        LIMIT 25
      }
      RETURN item
    `;

    const result = await runQuery(cypher, { q });
    const items = result.records.map(r => r.get("item"));
    res.json({ results: items });
  } catch (err) {
    next(err);
  }
}

export default router;