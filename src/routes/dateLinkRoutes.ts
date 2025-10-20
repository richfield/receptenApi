import express, { Request, Response } from 'express';
import { linkRecipeToDate, unlinkRecipeFromDate, getDatesWithRecipes, generateIcal, getFirstRecipeForToday } from '../services/dateLinkService';

const router = express.Router();

// Link a recipe to a date
router.post('/link', async (req: Request, res: Response) => {
    const { date, recipeId } = req.body;

    try {
        const linked = await linkRecipeToDate(new Date(date), recipeId);
        res.status(201).json(linked);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

// Unlink a recipe from a date
router.delete('/link', async (req: Request, res: Response) => {
    const { date, recipeId } = req.body;

    try {
        const unlinked = await unlinkRecipeFromDate(new Date(date), recipeId);
        res.status(200).json(unlinked);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
    }
});

router.get('/today', async (_req: Request, res: Response) => {
    try {
        const recipe = await getFirstRecipeForToday();
        res.status(200).json(recipe);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
    }
    }
});

// Get a list of dates with their recipes
router.get('/dates-with-recipes', async (_req: Request, res: Response) => {
    try {
        const datesWithRecipes = await getDatesWithRecipes();
        res.status(200).json(datesWithRecipes);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

// iCal endpoint
router.get('/ical', async (_req: Request, res: Response) => {
    try {
        const icalData = await generateIcal();
        res.setHeader('Content-Type', 'text/calendar');
        res.send(icalData);
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

export default router;
