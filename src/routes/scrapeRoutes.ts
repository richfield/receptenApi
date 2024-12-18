import express, { Request, Response } from 'express';
import { parseURL, Recipe } from "html-recipe-parser";
import puppeteer from "puppeteer";
import { convertIRecipeToRecipeData } from "../functions";
import { saveRecipe } from "../services/recipeService";
import { RecipeData } from "../Types";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const myUrl = req.query['url'] as string;
        if (!myUrl) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const recipe: Recipe = await parseURL(myUrl).catch(err => { res.json(err); return err; });
        if (recipe && recipe.instructions) {
            const newRecipe = convertIRecipeToRecipeData(recipe);
            saveRecipe(newRecipe);
            res.json(newRecipe);
            console.log(`Downloaded ${myUrl} through html-recipe-parser`)
            return;
        }
        console.log("Launching puppeteer")
        // Launch Puppeteer to scrape the webpage
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        console.log("Launched puppeteer")

        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive'
        });

        // Navigate to the specified URL
        await page.goto(myUrl, {});
        console.log("starting puppeteer")
        // Extract recipe data from <script type="application/ld+json">
        let recipeData: RecipeData = {};
        const scriptElements = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => script.innerHTML);
        });
        console.log({scriptElements})
        for (const scriptContent of scriptElements) {
            if (scriptContent) {
                try {
                    const jsonData = JSON.parse(scriptContent.trim());
                    if (jsonData['@type'] === 'Recipe') {
                        recipeData = jsonData as RecipeData;
                        console.log({jsonData, recipeData})
                        break; // Break the loop if we found the recipe
                    }

                    // If there's an @graph array, search within it
                    if (jsonData['@graph']) {
                        const graphRecipe = jsonData['@graph'].find((item: { [x: string]: string; }) => item['@type'] === 'Recipe');
                        if (graphRecipe) {
                            recipeData = graphRecipe as RecipeData;
                            console.log({ graphRecipe, recipeData })
                            break; // Break the loop once we find the recipe
                        }
                    }
                } catch (err) {
                    console.error("Failed to parse JSON:", err);
                }
            }
        }

        if (recipeData.name) {
            // Extract the recipe details
            const title = recipeData.name || 'No title found';
            const ingredients = recipeData.recipeIngredient || [];
            const preparationSteps = recipeData.recipeInstructions
                ? recipeData.recipeInstructions.map((step) => step.text)
                : [];
        } else {
            // Fallback extraction logic using Puppeteer
            recipeData = convertIRecipeToRecipeData(await page.evaluate(() => {
                return {
                    name: document.querySelector('h3.recipe-title')?.textContent || 'No title found',
                    imageUrl: (document.querySelector('.recipe-image') as HTMLImageElement)?.src || '',
                    prepTime: (document.querySelector('meta[itemprop="prepTime"]') as HTMLMetaElement)?.content || '',
                    cookTime: (document.querySelector('meta[itemprop="cookTime"]') as HTMLMetaElement)?.content || '',
                    totalTime: (document.querySelector('meta[itemprop="totalTime"]') as HTMLMetaElement)?.content || '',
                    yeld: (document.querySelector('.recipe-details a') as HTMLAnchorElement)?.textContent || '',
                    author: (document.querySelector('span[itemprop="name"]') as HTMLElement)?.textContent || '',
                    ingredients: Array.from(document.querySelectorAll('.ingredients li')).map(el => el.textContent?.trim() || ''),
                    instructions: Array.from(document.querySelectorAll('div[itemprop="recipeInstructions"] ol li')).map(el => el.textContent?.trim() || ''),
                };
            }));
        }

        // Save recipe to SQLite database
        const newRecipe = await saveRecipe(recipeData);

        // Close the browser
        await browser.close();
        console.log(`Downloaded ${myUrl} through puppeteer`)
        res.json(newRecipe);
    } catch (error) {
        console.log({ error });
        res.json(error);
    }
});

export default router;