import express, { Request, Response } from 'express';
import * as leftoverService from '../services/leftoverService';
import * as userProfileService from '../services/userProfileService';
import { RoleModel } from '../models/Role';
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

    const { recipeId, status, start, end } = req.query as { recipeId?: string; status?: string; start?: string; end?: string };
    const list = await leftoverService.listLeftovers({ recipeId, status: status as any, start, end });
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
    const { day } = req.body;
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const claimed = await leftoverService.claimLeftover(req.params.id, userId, day);
    res.json(claimed);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Allow a user to remove their own claim and put the item back in the freezer
router.post('/:id/unclaim', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const updated = await leftoverService.unclaimLeftover(req.params.id, userId);
      res.json(updated);
    } catch (e) {
      return res.status(403).json({ error: e instanceof Error ? e.message : 'Forbidden' });
    }
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});


// Allow admins to remove a leftover
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch the user's profile and determine admin membership
    try {
      const profile = await userProfileService.getUserProfile(userId);
      let isAdmin = false;
      if (profile && profile.roles) {
        for (const r of profile.roles as any[]) {
          if (!r) continue;
          if (typeof r === 'string') {
            if (r.toLowerCase && r.toLowerCase() === 'admin') { isAdmin = true; break; }
            // Attempt to resolve role by id
            try {
              const roleDoc = await RoleModel.findById(r);
              if (roleDoc && roleDoc.name === 'admin') { isAdmin = true; break; }
            } catch (e) {
              // ignore
            }
          } else if (r.name && r.name === 'admin') {
            isAdmin = true; break;
          } else if (r._id && String(r._id) && String(r._id) === String((await RoleModel.findOne({ name: 'admin' }))?._id)) {
            isAdmin = true; break;
          }
        }
      }

      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

      const deleted = await leftoverService.deleteLeftover(req.params.id);
      res.json({ deletedId: req.params.id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
    }
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
