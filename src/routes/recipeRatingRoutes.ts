import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../Types';
import { getRecipeRatings, getUserRatingForRecipe, setRecipeRating } from '../services/recipeRatingService';

const router = express.Router();

router.get('/recipe/:recipeId/ratings', async (req: Request<{ recipeId: string }>, res: Response) => {
    try {
        const recipeId = String(req.params.recipeId);
        const result = await getRecipeRatings(recipeId);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

router.get('/recipe/:recipeId/my-rating', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const recipeId = String(req.params.recipeId);
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'Missing authenticated user' });
        }

        const result = await getUserRatingForRecipe(recipeId, userId);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Unexpected error' });
    }
});

router.post('/recipe/:recipeId/rating', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const recipeId = String(req.params.recipeId);
        const userId = req.user?.uid;
        const { value } = req.body;
        if (!userId || typeof value !== 'number') {
            return res.status(400).json({ message: 'Authenticated user and numeric value are required' });
        }

        const result = await setRecipeRating(recipeId, userId, value);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Unexpected error' });
    }
});

export default router;
