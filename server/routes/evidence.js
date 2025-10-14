// server/routes/evidence.js
import { Router } from 'express';
import { runQuery } from '../neo4j.js';

const router = Router();

/**
 * Accept evidence
 * POST /api/evidence/:id/accept   body: { by?: string }
 * Sets: status=accepted, lastAction=accepted, lastActionAt=datetime(), lastActionBy
 */
router.post('/:id/accept', async (req, res, next) => {
  try {
    const id = req.params.id.toString();
    const by = (req.body?.by || 'ui').toString();

    const cypher = `
      MATCH (e:Diagnosis {id:$id})
      SET e.status = 'accepted',
          e.lastAction = 'accepted',
          e.lastActionBy = $by,
          e.lastActionAt = datetime()
      RETURN e{
        .id, .status, .lastAction, .lastActionBy,
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

/**
 * Reject evidence
 * POST /api/evidence/:id/reject   body: { comment: string, by?: string }
 * Sets: status=rejected, lastAction=rejected, rejectionComment, lastActionAt, lastActionBy
 */
router.post('/:id/reject', async (req, res, next) => {
  try {
    const id = req.params.id.toString();
    const comment = (req.body?.comment || '').toString().trim();
    const by = (req.body?.by || 'ui').toString();

    if (!comment) return res.status(400).json({ error: 'comment required' });

    const cypher = `
      MATCH (e:Diagnosis {id:$id})
      SET e.status = 'rejected',
          e.lastAction = 'rejected',
          e.rejectionComment = $comment,
          e.lastActionBy = $by,
          e.lastActionAt = datetime()
      RETURN e{
        .id, .status, .lastAction, rejectionComment: e.rejectionComment, .lastActionBy,
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
