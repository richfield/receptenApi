import express, { Request, Response } from 'express';
import { parseURL } from 'html-recipe-parser';
import puppeteer from 'puppeteer';
import { convertIRecipeToRecipeData } from '../functions';
import { saveRecipe, setImageByUrl } from '../services/recipeService';
import { RecipeData } from '../Types';
import { IRecipe } from 'html-recipe-parser/dist/interfaces';

const router = express.Router();

/**
 * @openapi
 * /scrape:
 *   get:
 *     summary: Scrape a URL to extract recipe data
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parsed and saved recipe
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const myUrl = req.query['url'] as string;
        if (!myUrl) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }
        const isMarleySpoon = new URL(myUrl).hostname.endsWith('marleyspoon.nl');
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
        if (!isMarleySpoon && recipe && recipe.instructions) {
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
        await page.goto(myUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (isMarleySpoon) {
            await page.waitForSelector('h1', { timeout: 10000 }).catch(() => undefined);
        }

        if (isMarleySpoon) {
            const marleySpoonRecipe = await page.evaluate((sourceUrl) => {
                const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                const pageText = document.body.innerText.replace(/\r/g, '');
                const title = text(document.querySelector('h1')) || document.title.split('|')[0].trim();
                const image = (Array.from(document.querySelectorAll('img')) as HTMLImageElement[])
                    .find((element) => element.src.includes('/media/recipes/') && element.src.includes('/main_photos/'))?.src || '';

                const descriptionMatch = pageText.match(/Tafelverhaal\s+([\s\S]*?)(?=Gecreëerd door:|Start nu)/i);
                const description = descriptionMatch?.[1]?.replace(/\s+/g, ' ').trim() || '';
                const ingredients = Array.from(document.querySelectorAll('img[alt]'))
                    .map((element) => (element as HTMLImageElement).alt.trim())
                    .filter((value) => value && !/^(image|logo|amex|mastercard|visa|discover|paypal|ideal|googlepay)$/i.test(value));
                const instructionSection = pageText.match(/Kook dit gerecht in \d+ simpele stappen([\s\S]*?)(?=Social media|Je kunt betalen met)/i)?.[1] || '';
                const instructionMatches = Array.from(instructionSection.matchAll(/(?:^|\n)\s*(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=\n\s*\d+\.\s|$)/g));
                const instructions = instructionMatches.map((match) => {
                    const name = match[2].trim();
                    const stepText = match[3].replace(/\s+/g, ' ').trim();
                    return { '@type': 'HowToStep' as const, name, text: stepText };
                }).filter((step) => step.text);

                return {
                    '@context': 'https://schema.org' as const,
                    '@type': 'Recipe' as const,
                    name: title || sourceUrl,
                    url: sourceUrl,
                    description,
                    images: image ? [image] : [],
                    recipeIngredient: ingredients,
                    recipeInstructions: instructions,
                    totalTime: pageText.match(/BEREIDINGSTIJD\s*\n?([^\n]+)/i)?.[1]?.trim() || '',
                };
            }, myUrl);

            if (marleySpoonRecipe.name && marleySpoonRecipe.recipeInstructions.length > 0) {
                const savedRecipe = await saveRecipe(marleySpoonRecipe);
                if (marleySpoonRecipe.images[0] && savedRecipe._id) {
                    await setImageByUrl(savedRecipe._id, marleySpoonRecipe.images[0]);
                }
                await browser.close();
                res.json(savedRecipe);
                return;
            }
        }

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
        console.error({ error, req, res });
        res.json(error);
    }
});

export default router;