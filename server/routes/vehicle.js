// server/routes/vehicle.js
import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

router.get("/:vin", async (req, res, next) => {
  try {
    const vin = req.params.vin.toString().trim();

const cypher = `
  MATCH (v:Vehicle {vin:$vin})

  // Repairs
  OPTIONAL MATCH (v)-[:HAS_REPAIR]->(r:Repair)
  WITH v, collect(DISTINCT {
    id:   coalesce(toString(r.id), elementId(r)),
    name: r.name,
    date: r.date
  }) AS repairs

  // DTCs
  OPTIONAL MATCH (v)-[:HAS_DTC]->(d:DTC)
  WITH v, repairs, collect(DISTINCT d) AS dtcs

  // Evidence via DTC  -> aggregate to a list
  OPTIONAL MATCH (d)-[:HAS_EVIDENCE]->(e1:Evidence)
  WITH v, repairs, dtcs, collect(DISTINCT e1) AS ev_from_dtc

  // Evidence directly on Vehicle -> aggregate to another list
  OPTIONAL MATCH (v)-[:HAS_EVIDENCE]->(e2:Evidence)
  WITH v, repairs, dtcs, ev_from_dtc, collect(DISTINCT e2) AS ev_from_vehicle

  // Now concatenate lists WITHOUT any further aggregation
  WITH v, repairs, dtcs, (ev_from_dtc + ev_from_vehicle) AS allEvsRaw

  // Project evidence with stable string id + safe fields
  WITH v, repairs, dtcs,
      [ev IN allEvsRaw WHERE ev IS NOT NULL |
        {
          id: coalesce(toString(ev.id), elementId(ev)),
          reason: coalesce(ev.summary, ev.description, ev.title, 'Reason not provided')
        }
      ] AS evidences


  // Operator (optional)
  OPTIONAL MATCH (v)-[:OPERATED_BY]->(o:Operator)
  WITH v, repairs, dtcs, evidences,
       o{ .name, city: o.city, postcode: o.postcode } AS operator

  // Choose a current DTC (first for now)
  WITH v, repairs, evidences, operator, dtcs,
       head([x IN dtcs | x.code]) AS currentDTC,
       dtcs AS allDTCs

  RETURN
    v{
      .vin, .make, .model, .year, .miles,
      licensePlate: v.licensePlate,
      vehicleType:  v.vehicleType,
      repairs: repairs
    } AS vehicle,
    operator,
    currentDTC,
    CASE WHEN currentDTC IS NOT NULL
      THEN {
        title: 'Likely issue ' + currentDTC,
        confidence: 0.72,
        summary: coalesce(head([x IN allDTCs WHERE x.code = currentDTC | x.description]), 'Based on DTC & evidence.'),
        nextSteps: ['Run sensor self-test','Inspect wiring','Check relevant TSB']
      }
      ELSE null END AS diagnosis,
    [x IN allDTCs | x{ .code, .description }] AS dtcs,
    evidences
`;


    const result = await runQuery(cypher, { vin });
    const rec = result.records?.[0];
    if (!rec) return res.status(404).json({ error: "Vehicle not found" });

    res.json({
      vehicle: rec.get("vehicle"),
      operator: rec.get("operator"),
      currentDTC: rec.get("currentDTC"),
      diagnosis: rec.get("diagnosis"),
      dtcs: rec.get("dtcs"),
      evidences: rec.get("evidences")
    });
  } catch (err) {
    next(err);
  }
});

export default router;
