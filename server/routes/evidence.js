// server/routes/evidence.js
import { Router } from 'express';
import { runQuery } from '../neo4j.js';

const router = Router();

/**
 * Accept evidence
 * POST /api/evidence/:id/accept   body: { by?: string }
 * Sets: status=accepted, lastAction=accepted, lastActionAt=datetime(), lastActionBy
 */
// Accept evidence
// Accept evidence
router.post('/:id/accept', async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const by = String(req.body?.by || 'ui');

    const cypher = `
      MATCH (e:Evidence)
      WHERE ((e.id IS NOT NULL AND toString(e.id) = $id) OR elementId(e) = $id)
      SET e.status = 'accepted',
          e.lastAction = 'accepted',
          e.lastActionBy = $by,
          e.lastActionAt = datetime(),
          e.rejectionComment = NULL
      RETURN e{
        id: coalesce(toString(e.id), elementId(e)),
        .status, .lastAction, .lastActionBy,
        lastActionAt: toString(e.lastActionAt)
      } AS evidence
    `;

    const result = await runQuery(cypher, { id, by });
    const rec = result.records?.[0];
    if (!rec) return res.status(404).json({ error: 'Evidence not found' });
    res.json({ message: 'thanks', evidence: rec.get('evidence') });
  } catch (err) {
    next(err);
  }
});


// Reject evidence
// Reject evidence
router.post('/:id/reject', async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    const by = String(req.body?.by || 'ui');
    const comment = String(req.body?.comment || '').trim();
    if (!comment) return res.status(400).json({ error: 'comment required' });

    const cypher = `
      MATCH (e:Evidence)
      WHERE ((e.id IS NOT NULL AND toString(e.id) = $id) OR elementId(e) = $id)
      SET e.status = 'rejected',
          e.lastAction = 'rejected',
          e.rejectionComment = $comment,
          e.lastActionBy = $by,
          e.lastActionAt = datetime()
      RETURN e{
        id: coalesce(toString(e.id), elementId(e)),
        .status, .lastAction, rejectionComment: e.rejectionComment, .lastActionBy,
        lastActionAt: toString(e.lastActionAt)
      } AS evidence
    `;

    const result = await runQuery(cypher, { id, comment, by });
    const rec = result.records?.[0];
    if (!rec) return res.status(404).json({ error: 'Evidence not found' });
    res.json({ evidence: rec.get('evidence') });
  } catch (err) {
    next(err);
  }
});


export default router;
