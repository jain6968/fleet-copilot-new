// server/routes/search.js
import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

// GET /api/search?q=...
router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json({ results: [] });

const cypher = `
  // VEHICLES
  MATCH (v:Vehicle)
  WHERE v.vin STARTS WITH $q
     OR toLower(v.licensePlate) CONTAINS toLower($q)
     OR toLower(v.make) CONTAINS toLower($q)
     OR toLower(v.model) CONTAINS toLower($q)
  RETURN {
    type:'vehicle',
    vin: v.vin,
    make: v.make,
    model: v.model,
    year: v.year,
    miles: v.miles,
    licensePlate: v.licensePlate
  } AS item
  LIMIT 25

  UNION

  // REPAIRS
  MATCH (v:Vehicle)-[:HAS_REPAIR]->(r:Repair)
  WHERE v.vin STARTS WITH $q
     OR toLower(coalesce(r.name, '')) CONTAINS toLower($q)
     OR toLower(coalesce(r.id,   '')) CONTAINS toLower($q)
  RETURN {
    type:'repair',
    id: r.id,
    name: r.name,
    date: r.date,
    vin: v.vin
  } AS item
  LIMIT 25

  UNION

  // DTCs
  MATCH (v:Vehicle)-[:HAS_DTC]->(d:DTC)
  WHERE v.vin STARTS WITH $q
     OR toLower(coalesce(d.code,        '')) CONTAINS toLower($q)
     OR toLower(coalesce(d.description, '')) CONTAINS toLower($q)
  OPTIONAL MATCH (d)-[:HAS_EVIDENCE]->(e:Evidence)
  WITH v, d, count(e) AS evCount
  RETURN {
    type:'dtc',
    code: d.code,
    description: d.description,
    evidenceCount: evCount,
    vin: v.vin
  } AS item
  LIMIT 25

  UNION

  // EVIDENCE DIRECTLY ON VEHICLE
  MATCH (v:Vehicle)-[:HAS_EVIDENCE]->(e:Evidence)
  WHERE v.vin STARTS WITH $q
     OR toLower(coalesce(e.title,   '')) CONTAINS toLower($q)
     OR toLower(coalesce(e.summary, '')) CONTAINS toLower($q)
     OR toLower(coalesce(e.type,    '')) CONTAINS toLower($q)
  RETURN {
    type:'evidence',
    id: e.id,
    title: e.title,
    type: e.type,
    vin: v.vin
  } AS item
  LIMIT 25
`;


    const result = await runQuery(cypher, { q });
    const items = (result.records || []).map(r => r.get("item")).filter(Boolean);
    res.json({ results: items });
  } catch (err) {
    next(err);
  }
});

export default router;
