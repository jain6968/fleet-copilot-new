// server/routes/vehicle.js
import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

router.get("/:vin", async (req, res, next) => {
  try {
    const vin = req.params.vin.toString().trim();

    const cypher = `
      // Match vehicle case-insensitively (in case VINs are lowercased)
      MATCH (v:Vehicle)
      WHERE toLower(v.vin) = toLower($vin)

      // ---------------- Repairs (Maintenance History Source) ----------------
      OPTIONAL MATCH (v)-[:HAS_REPAIR]->(r:Repair)
      WITH v,
           [r IN collect(DISTINCT r) WHERE r IS NOT NULL |
             {
               id: coalesce(toString(r.id), elementId(r)),
               date: toString(r.date),
               title: coalesce(r.name, r.title, 'Maintenance'),
               description: coalesce(r.description, '—'),
               type: properties(r)['type'],
               mileage: properties(r)['mileage'],
               workOrderId: properties(r)['workOrderId'],
               performedBy: properties(r)['performedBy'],
               cost: properties(r)['cost'],
               parts: properties(r)['parts']
             }
           ] AS maintenanceHistoryRaw

      // ---------------- DTCs ----------------
      OPTIONAL MATCH (v)-[:HAS_DTC]->(d:DTC)
      WITH v, maintenanceHistoryRaw, collect(DISTINCT d) AS dtcs

      // ---------------- Evidence ----------------
      OPTIONAL MATCH (d)-[:HAS_EVIDENCE]->(e1:Evidence)
      OPTIONAL MATCH (v)-[:HAS_EVIDENCE]->(e2:Evidence)
      WITH v, maintenanceHistoryRaw, dtcs, collect(DISTINCT e1) + collect(DISTINCT e2) AS allEvsRaw

      // Project evidence with safe fallback
      WITH v, maintenanceHistoryRaw, dtcs,
           [ev IN allEvsRaw WHERE ev IS NOT NULL |
             {
               id: coalesce(toString(ev.id), elementId(ev)),
               reason: coalesce(ev.summary, ev.description, ev.title, 'Reason not provided')
             }
           ] AS evidences

      // ---------------- Operator ----------------
      OPTIONAL MATCH (v)-[:OPERATED_BY]->(o:Operator)
      WITH v, maintenanceHistoryRaw, dtcs, evidences,
           o{ .name, city: o.city, postcode: o.postcode } AS operator

      // ---------------- Select DTC for diagnosis ----------------
      WITH v, maintenanceHistoryRaw, evidences, operator, dtcs,
           head([x IN dtcs | x.code]) AS currentDTC,
           dtcs AS allDTCs

      // ---------------- Sort maintenance history by date ----------------
      UNWIND maintenanceHistoryRaw AS mh
      WITH v, operator, dtcs, evidences, currentDTC, allDTCs, mh
      ORDER BY CASE WHEN mh.date IS NULL OR mh.date = '' THEN 1 ELSE 0 END, mh.date DESC
      WITH v, operator, dtcs, evidences, currentDTC, allDTCs, collect(mh) AS maintenanceHistory

      RETURN
        v{
          .vin, .make, .model, .year, .miles,
          licensePlate: v.licensePlate,
          vehicleType:  v.vehicleType
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
        evidences,
        maintenanceHistory
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
      evidences: rec.get("evidences"),
      maintenanceHistory: rec.get("maintenanceHistory")
    });
  } catch (err) {
    next(err);
  }
});

export default router;
