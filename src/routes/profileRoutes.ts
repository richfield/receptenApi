import express, { Request, Response } from 'express';
import * as userProfileService from '../services/userProfileService';
import { AuthenticatedRequest } from '../Types';

const router = express.Router();

router.get('/me', async (req: Request, res: Response) => {
    try {
        const firebaseUID = (req as AuthenticatedRequest).user?.uid;
        if (!firebaseUID) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const profile = await userProfileService.getUserProfile(firebaseUID);
        res.json(profile);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

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

    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Route to get all roles
router.get('/roles', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const roles = await userProfileService.getAllRoles();
        res.json(roles);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Route to get all groups
router.get('/groups', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const groups = await userProfileService.getAllGroups();
        res.json(groups);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
});

export default router;