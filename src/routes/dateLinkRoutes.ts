import express, { Request, Response } from 'express';
import { linkRecipeToDate, unlinkRecipeFromDate, getDatesWithRecipes, generateIcal, getFirstRecipeForToday } from '../services/dateLinkService';

const router = express.Router();

// Link a recipe to a date
/**
 * @openapi
 * /calendar/link:
 *   post:
 *     summary: Link a recipe to a date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               recipeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Linked resource
 */
router.post('/link', async (req: Request, res: Response) => {
    const { date, recipeId } = req.body;

    try {
        const linked = await linkRecipeToDate(new Date(date), recipeId);
        res.status(201).json(linked);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

// Unlink a recipe from a date
/**
 * @openapi
 * /calendar/link:
 *   delete:
 *     summary: Unlink a recipe from a date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               recipeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unlinked resource
 */
router.delete('/link', async (req: Request, res: Response) => {
    const { date, recipeId } = req.body;

    try {
        const unlinked = await unlinkRecipeFromDate(new Date(date), recipeId);
        res.status(200).json(unlinked);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
    }
});

/**
 * @openapi
 * /calendar/today:
 *   post:
 *     summary: Get first recipe for a given date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Recipe for the date
 */
router.post('/today', async (req: Request, res: Response) => {
    try {
        const { date } = req.body;
        const recipe = await getFirstRecipeForToday(new Date(date));
        res.status(200).json(recipe);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
    }
    }
});

// Get a list of dates with their recipes
/**
 * @openapi
 * /calendar/dates-with-recipes:
 *   get:
 *     summary: Get list of dates with recipes
 *     responses:
 *       200:
 *         description: List of dates with recipes
 */
router.get('/dates-with-recipes', async (_req: Request, res: Response) => {
    try {
        const datesWithRecipes = await getDatesWithRecipes();
        res.status(200).json(datesWithRecipes);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, _req, res})
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
});

// iCal endpoint
/**
 * @openapi
 * /calendar/ical:
 *   get:
 *     summary: Get iCal file for recipes
 *     responses:
 *       200:
 *         description: iCal data (text/calendar)
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 */
router.get('/ical', async (_req: Request, res: Response) => {
    try {
        const icalData = await generateIcal();

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'inline; filename="recipes.ics"');

        res.send(icalData);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
