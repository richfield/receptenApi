import express, { Request, Response } from 'express';
import * as recipeService from '../services/recipeService';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const recipes = await recipeService.getAllRecipes();
        res.json(recipes);
    } catch (error) {
        if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        }
    }
});

router.get('/get/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const recipe = await recipeService.getRecipeById(id);
        res.json(recipe);
    } catch (error) {
        if(error instanceof Error) {
            res.status(404).json({ error: error.message });
        }
    }
});

router.post('/save', async (req: Request, res: Response) => {
    const recipeData = req.body;
    try {
        await recipeService.saveRecipe(recipeData);
        res.json({ message: 'Recipe saved successfully' });
    } catch (error) {
        if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        }
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await recipeService.deleteRecipe(id);
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        if (error instanceof Error) {
        res.status(404).json({ error: error.message });
        }
    }
});

router.get('/search', async (req: Request, res: Response) => {
    const { query } = req.query as { query?: string; };
    try {
        const recipes = await recipeService.searchRecipes(query || '');
        res.json(recipes);
    } catch (error) {
        if (error instanceof Error) {
        res.status(404).json({ error: error.message });
        }
    }
});

export default router;
