import express, { Request, Response } from 'express';
import * as leftoverService from '../services/leftoverService';
import { AuthenticatedRequest } from '../Types';

const router = express.Router();

/**
 * @openapi
 * /leftovers:
 *   post:
 *     summary: Add a leftover portion to the freezer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipeId:
 *                 type: string
 *               portion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Leftover added
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { recipeId, portion } = req.body;
    const addedBy = uid;
    const leftover = await leftoverService.addLeftover(recipeId, addedBy, portion);
    res.status(201).json(leftover);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /leftovers:
 *   get:
 *     summary: List leftovers currently in the freezer
 *     responses:
 *       200:
 *         description: Array of leftovers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const uid = (req as AuthenticatedRequest).user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { recipeId } = req.query as { recipeId?: string };
    const list = await leftoverService.listFreezerLeftovers(recipeId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /leftovers/{id}/claim:
 *   post:
 *     summary: Claim a leftover (removes it from the freezer)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claimed leftover
 */
router.post('/:id/claim', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const claimed = await leftoverService.claimLeftover(req.params.id, userId);
    res.json(claimed);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
