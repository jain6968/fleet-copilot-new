import { Router } from "express";
import { runQuery } from "../neo4j.js";

const router = Router();

router.post("/:id/action", async (req, res) => {
  try {
    const id = req.params.id.toString().trim();
    const action = (req.body?.action || "").toString().trim();
    const user = (req.body?.user || "anonymous").toString().trim();

    if (!id || !action) {
      return res.status(400).json({ error: "Missing id or action" });
    }

    const cypher = `
      MATCH (e:Evidence {id:$id})
      SET e.lastAction=$action,
          e.lastActionBy=$user,
          e.lastActionAt=timestamp()
      RETURN e { .id, .title, .type, .lastAction, .lastActionBy, .lastActionAt } AS evidence
    `;

    const row = (await runQuery(cypher, { id, action, user }))[0];
    if (!row) return res.status(404).json({ error: "Evidence not found" });

    res.json({ ok: true, evidence: row.evidence });
  } catch (err) {
    console.error("[evidence] error:", err);
    res.status(500).json({ error: "Evidence update failed", detail: String(err) });
  }
});

export default router;
