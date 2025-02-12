import express, { Request, Response } from 'express';
import * as recipeService from '../services/recipeService';

import multer from 'multer';

const router = express.Router();
const upload = multer();
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
        const saved = await recipeService.saveRecipe(recipeData);
        res.json({ message: 'Recipe saved successfully', _id: saved._id });
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


// Route to set image by recipeId and URL
router.post('/:recipeId/image/url', async (req: Request, res: Response) => {
    try {
        const { recipeId } = req.params;
        const { url } = req.body;

        if (!url) {
            throw new Error('URL is required');
        }

        const updatedRecipe = await recipeService.setImageByUrl(recipeId, url);
        res.status(200).json(updatedRecipe);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json(error);
        }
    }
});

// Route to set image by recipeId and file upload
router.post('/:recipeId/image/upload', upload.single('image'), async (req: Request<{ recipeId: string }>, res: Response) => {
    try {
        const { recipeId } = req.params;
        const file = req.file;

        if (!file) {
            throw new Error('File is required')
        }

        const updatedRecipe = await recipeService.setImageByFile(recipeId, file.buffer);
        res.status(200).json(updatedRecipe);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else  {
            res.status(500).json(error);
        }
    }
});

router.get('/:recipeId/image', async (req: Request<{ recipeId: string }>, res: Response) => {
    try {
        const { recipeId } = req.params;
        const imageBuffer = await recipeService.getImageById(recipeId);

        if (!imageBuffer) {
            throw new Error('Image not found');
        }

        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(imageBuffer);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json(error);
        }
    }
});

export default router;
