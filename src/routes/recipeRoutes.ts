import express, { Request, Response } from 'express';
import * as recipeService from '../services/recipeService';

import multer from 'multer';
import path from 'path';

const router = express.Router();
const upload = multer();
/**
 * @openapi
 * /recipes:
 *   get:
 *     summary: Get all recipes
 *     responses:
 *       200:
 *         description: Array of recipes
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const recipes = await recipeService.getAllRecipes();
        res.json(recipes);
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
 * /recipes/get/{id}:
 *   get:
 *     summary: Get a recipe by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The recipe
 */
router.get('/get/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const recipe = await recipeService.getRecipeById(id);
        res.json(recipe);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if(error instanceof Error) {
            res.status(404).json({ error: error.message });
        }
    }
});

/**
 * @openapi
 * /recipes/save:
 *   post:
 *     summary: Save a recipe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeData'
 *     responses:
 *       200:
 *         description: Saved result
 */
router.post('/save', async (req: Request, res: Response) => {
    const recipeData = req.body;
    try {
        const saved = await recipeService.saveRecipe(recipeData);
        res.json({ message: 'Recipe saved successfully', _id: saved._id });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
    }
});

/**
 * @openapi
 * /recipes/{id}:
 *   delete:
 *     summary: Delete a recipe by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion result
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        await recipeService.deleteRecipe(id);
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
        res.status(404).json({ error: error.message });
        }
    }
});

/**
 * @openapi
 * /recipes/search:
 *   get:
 *     summary: Search recipes
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req: Request, res: Response) => {
    const { query } = req.query as { query?: string; };
    try {
        const recipes = await recipeService.searchRecipes(query || '');
        res.json(recipes);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
        res.status(404).json({ error: error.message });
        }
    }
});


// Route to set image by recipeId and URL
/**
 * @openapi
 * /recipes/{recipeId}/image/url:
 *   post:
 *     summary: Set recipe image from a URL
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated recipe
 */
router.post('/:recipeId/image/url', async (req: Request<{ recipeId: string }>, res: Response) => {
    try {
        const { recipeId } = req.params;
        const { url } = req.body;

        if (!url) {
            throw new Error('URL is required');
        }

        const updatedRecipe = await recipeService.setImageByUrl(recipeId, url);
        res.status(200).json(updatedRecipe);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json(error);
        }
    }
});

// Route to set image by recipeId and file upload
/**
 * @openapi
 * /recipes/{recipeId}/image/upload:
 *   post:
 *     summary: Upload an image file for a recipe
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated recipe
 */
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
        // eslint-disable-next-line no-console
        console.error({error, req, res})
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else  {
            res.status(500).json(error);
        }
    }
});

/**
 * @openapi
 * /recipes/{recipeId}/image:
 *   get:
 *     summary: Get recipe image
 *     parameters:
 *       - in: path
 *         name: recipeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:recipeId/image', async (req: Request<{ recipeId: string }>, res: Response) => {
    try {
        const { recipeId } = req.params;
        const imageBuffer = await recipeService.getImageById(recipeId);
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(imageBuffer);
    } catch (error) {
        if (error instanceof recipeService.ImageNotFoundError) {
            // Serve default image file from /public/default.jpg
            const defaultImagePath = path.join(process.cwd(), 'public', 'default.jpg');
            res.setHeader('Content-Type', 'image/jpeg');
            res.status(200);//.send(defaultImageBuffer);
            res.sendFile(defaultImagePath, (err) => {
                // eslint-disable-next-line no-console
                if (err) { console.error('Error sending default image', err); res.status(500).json({ error: 'Failed to send default image' }); }
            });
        } else {
            // eslint-disable-next-line no-console
            console.error({error, req, res})
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});


export default router;
