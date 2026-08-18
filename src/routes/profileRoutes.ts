import express, { Request, Response } from 'express';
import * as userProfileService from '../services/userProfileService';
import { AuthenticatedRequest } from '../Types';
import admin from 'firebase-admin';

const router = express.Router();

/**
 * @openapi
 * /profile/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const firebaseUID = (req as AuthenticatedRequest).user?.uid;
        if (!firebaseUID) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const profile = await userProfileService.getUserProfile(firebaseUID);
        res.json(profile);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * @openapi
 * /profile/me:
 *   post:
 *     summary: Update the authenticated user's profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.post('/me', async (req: Request, res: Response) => {
    try {
        const firebaseUID = (req as AuthenticatedRequest).user?.uid;
        if (!firebaseUID) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const profileData = req.body;
        const updatedProfile = await userProfileService.setUserProfile(firebaseUID, profileData);
        res.json(updatedProfile);

    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Route to get all roles
/**
 * @openapi
 * /profile/roles:
 *   get:
 *     summary: Get all roles
 *     responses:
 *       200:
 *         description: Array of roles
 */
router.get('/roles', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const roles = await userProfileService.getAllRoles();
        res.json(roles);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Route to get all groups
/**
 * @openapi
 * /profile/groups:
 *   get:
 *     summary: Get all groups
 *     responses:
 *       200:
 *         description: Array of groups
 */
router.get('/groups', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const groups = await userProfileService.getAllGroups();
        res.json(groups);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});


// Batch lookup of user profiles by Firebase UID — returns array of { uid, displayName, email }
router.get('/batch', async (req: Request, res: Response) => {
    try {
        const uidsParam = (req.query.uids as string) || '';
        const uids = uidsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (uids.length === 0) return res.json([]);

        // Use firebase-admin to batch fetch user records
        const users = await admin.auth().getUsers(uids.map(u => ({ uid: u })));
        const mapped = users.users.map(u => ({ uid: u.uid, displayName: u.displayName || u.email || u.uid, email: u.email, photoURL: u.photoURL }));
        res.json(mapped);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;