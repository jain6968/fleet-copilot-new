// ESM module
import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

// GET /api/search?q=...
router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      const e = new Error("Missing q");
      e.status = 400;
      throw e;
    }

    const cypher = `
      CALL {
        WITH $q AS q
        MATCH (v:Vehicle)
        WHERE toLower(v.vin)   CONTAINS toLower(q)
           OR toLower(v.make)  CONTAINS toLower(q)
           OR toLower(v.model) CONTAINS toLower(q)
        RETURN { type: "vehicle", vin: v.vin, make: v.make, model: v.model } AS item
        LIMIT 25
      }
      RETURN item
    `;

    const result = await runQuery(cypher, { q });
    const records = Array.isArray(result?.records) ? result.records : [];
    const items = records.map(r => r.get("item")).filter(Boolean);
    res.json({ results: items });
  } catch (err) {
    next(err);
  }
});

export default router;  // <<< default export
