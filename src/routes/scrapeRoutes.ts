import express, { Request, Response } from 'express';
import { parseURL } from 'html-recipe-parser';
import puppeteer from 'puppeteer';
import { convertIRecipeToRecipeData } from '../functions';
import { saveRecipe, setImageByUrl } from '../services/recipeService';
import { RecipeData } from '../Types';
import { IRecipe } from 'html-recipe-parser/dist/interfaces';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const myUrl = req.query['url'] as string;
        if (!myUrl) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }
        // Set a timeout of 30 seconds
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 30000)
        );

        // Wrap the parseURL call with the timeout
        const parseRecipePromise: Promise<IRecipe | string> = parseURL(myUrl).catch((err: Error) => {
            res.json(err);
            return err;
        });

        let recipe = await Promise.race([timeoutPromise, parseRecipePromise]).catch(err => err) as IRecipe | string;
        // let recipe: Recipe|string = await parseURL(myUrl).catch((err: Error) => { res.json(err); return err; });
        if (typeof recipe === 'string') {
            // res.status(500).json({ error: 'Cannot parse url: ' + myUrl });
            // return;
            recipe = {} as IRecipe;
        }
        if (recipe && recipe.instructions) {
            const savedRecipe = await saveRecipe(convertIRecipeToRecipeData(recipe));
            if (savedRecipe.images && savedRecipe.images?.length > 0 && savedRecipe._id) {
                setImageByUrl(savedRecipe._id, savedRecipe.images[0])
            }

            res.json(savedRecipe);
            return;
        }
        // Launch Puppeteer to scrape the webpage
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-features=site-per-process',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36'
            ],
        });

        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive'
        });

        // Navigate to the specified URL
        await page.goto(myUrl, {});
        // Extract recipe data from <script type="application/ld+json">
        let recipeData: RecipeData = {};
        const scriptElements = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => script.innerHTML);
        });

        for (const scriptContent of scriptElements) {
            if (scriptContent) {
                try {
                    const jsonData = JSON.parse(scriptContent.trim());
                    if (jsonData['@type'] === 'Recipe') {
                        recipeData = jsonData as RecipeData;
                        break; // Break the loop if we found the recipe
                    }

                    // If there's an @graph array, search within it
                    if (jsonData['@graph']) {
                        const graphRecipe = jsonData['@graph'].find((item: { [x: string]: string; }) => item['@type'] === 'Recipe');
                        if (graphRecipe) {
                            recipeData = graphRecipe as RecipeData;
                            break; // Break the loop once we find the recipe
                        }
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to parse JSON:', err);
                }
            }
        }
        if (recipeData?.name) {
            if (Array.isArray(recipeData.image)) {
                recipeData.images = recipeData.image
            } else if (recipeData && typeof recipeData.image === 'string') {
                recipeData.images = [recipeData.image]
            }

        } else {
            // Fallback extraction logic using Puppeteer
            recipeData = convertIRecipeToRecipeData(await page.evaluate((url) => {
                return {
                    name: document.querySelector('h3.recipe-title')?.textContent || url,
                    description: (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || url,
                    imageUrl: (document.querySelector('.recipe-image') as HTMLImageElement)?.src || '',
                    prepTime: (document.querySelector('meta[itemprop="prepTime"]') as HTMLMetaElement)?.content || '',
                    cookTime: (document.querySelector('meta[itemprop="cookTime"]') as HTMLMetaElement)?.content || '',
                    totalTime: (document.querySelector('meta[itemprop="totalTime"]') as HTMLMetaElement)?.content || '',
                    yeld: (document.querySelector('.recipe-details a') as HTMLAnchorElement)?.textContent || '',
                    author: (document.querySelector('span[itemprop="name"]') as HTMLElement)?.textContent || '',
                    ingredients: Array.from(document.querySelectorAll('.ingredients li')).map(el => el.textContent?.trim() || ''),
                    instructions: Array.from(document.querySelectorAll('div[itemprop="recipeInstructions"] ol li')).map(el => el.textContent?.trim() || ''),
                };
            }, myUrl));
        }
        // Save recipe to SQLite database
        const newRecipe = await saveRecipe(recipeData);
        if (newRecipe.images && newRecipe.images?.length > 0 && newRecipe._id) {
            const image = newRecipe.images.find(i => i);
            if (image) {
                setImageByUrl(newRecipe._id, image);
            }
        }

        // Close the browser
        await browser.close();
        res.json(newRecipe);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error({ error });
        res.json(error);
    }
});

export default router;