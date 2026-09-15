import express, { Request, Response } from 'express';
import { parseURL } from 'html-recipe-parser';
import puppeteer, { type Page } from 'puppeteer';
import { convertIRecipeToRecipeData } from '../functions';
import { saveRecipe, setImageByUrl } from '../services/recipeService';
import { RecipeData } from '../Types';
import { IRecipe } from 'html-recipe-parser/dist/interfaces';

const router = express.Router();

const normalizeJsonLd = (content: string): string => content.replace(/[\u0000-\u001F]/g, ' ');

const decodeHtmlEntities = (value: string): string => value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const decodeRecipeText = (recipe: RecipeData): RecipeData => ({
    ...recipe,
    name: typeof recipe.name === 'string' ? decodeHtmlEntities(recipe.name) : recipe.name,
    description: typeof recipe.description === 'string' ? decodeHtmlEntities(recipe.description) : recipe.description,
    recipeIngredient: recipe.recipeIngredient?.map(item => decodeHtmlEntities(item)),
    recipeInstructions: recipe.recipeInstructions?.map(instruction => ({
        ...instruction,
        name: decodeHtmlEntities(instruction.name),
        text: decodeHtmlEntities(instruction.text),
    })),
});

type RecipeInstruction = NonNullable<RecipeData['recipeInstructions']>[number];

const flattenInstructions = (value: unknown): RecipeInstruction[] => {
    if (typeof value === 'string') {
        const text = value.trim();
        return text ? [{ '@type': 'HowToStep', name: text, text }] : [];
    }
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item): RecipeInstruction[] => {
        if (typeof item === 'string') {
            return flattenInstructions(item);
        }
        if (!item || typeof item !== 'object') {
            return [];
        }

        const instruction = item as Partial<RecipeInstruction> & { itemListElement?: unknown };
        if (instruction['@type'] === 'HowToSection') {
            return flattenInstructions(instruction.itemListElement);
        }
        if (instruction['@type'] === 'HowToStep' && typeof instruction.text === 'string') {
            return [{
                '@type': 'HowToStep',
                name: typeof instruction.name === 'string' ? instruction.name : instruction.text,
                text: instruction.text,
            }];
        }
        return [];
    });
};

const recipeScore = (recipe: RecipeData): number =>
    (Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions.length : 0) * 2
    + (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.length : 0);

const extractVisibleInstructions = async (page: Page): Promise<RecipeInstruction[]> => page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('h2, h3, p'));
    const steps: { '@type': 'HowToStep'; name: string; text: string }[] = [];
    let collecting = false;
    let currentName = '';
    let currentText: string[] = [];

    const finishStep = () => {
        const text = currentText.join(' ').replace(/\s+/g, ' ').trim();
        if (currentName && text) {
            steps.push({ '@type': 'HowToStep', name: currentName, text });
        }
        currentName = '';
        currentText = [];
    };

    for (const element of elements) {
        const text = element.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!text) continue;

        if (element.matches('h2, h3')) {
            if (/delen met vrienden|additional links/i.test(text)) break;
            if (!collecting && /stap voor stap recept/i.test(text)) {
                collecting = true;
                continue;
            }
            if (collecting) {
                finishStep();
                currentName = text;
            }
        } else if (collecting && currentName) {
            currentText.push(text);
        }
    }
    finishStep();
    return steps;
});

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
            ...(process.env.PUPPETEER_EXECUTABLE_PATH
                ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
                : {}),
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
                const pageText = document.body.innerText.replace(/\r/g, '');
                const title = text(document.querySelector('h1')) || document.title.split('|')[0].trim();
                const image = (Array.from(document.querySelectorAll('img')) as HTMLImageElement[])
                    .map((element) => element.src || element.dataset.src || element.srcset?.split(',')[0]?.trim().split(' ')[0] || '')
                    .find((source) => source.includes('/media/recipes/') && source.includes('/main_photos/')) || '';

                const descriptionMatch = pageText.match(/Tafelverhaal\s+([\s\S]*?)(?=Gecreëerd door:|Start nu)/i);
                const description = descriptionMatch?.[1]?.replace(/\s+/g, ' ').trim() || '';
                const ingredients = Array.from(document.querySelectorAll('.dish-detail__we-send img[alt]'))
                    .map((element) => (element as HTMLImageElement).alt.trim())
                    .filter(Boolean);
                const stepParagraphs = Array.from(document.querySelectorAll('.cooking-steps .dish-step__body p'))
                    .map((element) => text(element));
                const instructions = stepParagraphs.reduce<{ '@type': 'HowToStep'; name: string; text: string }[]>((steps, value, index) => {
                    const titleMatch = value.match(/^\d+\.\s*(.+)$/);
                    const stepText = stepParagraphs[index + 1];
                    if (titleMatch && stepText && !/^\d+\.\s*/.test(stepText)) {
                        steps.push({ '@type': 'HowToStep', name: titleMatch[1].trim(), text: stepText });
                    }
                    return steps;
                }, []);

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
        const recipeCandidates: RecipeData[] = [];
        const scriptElements = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => script.innerHTML);
        });

        for (const scriptContent of scriptElements) {
            if (scriptContent) {
                try {
                    const jsonData = JSON.parse(normalizeJsonLd(scriptContent).trim());
                    if (jsonData['@type'] === 'Recipe') {
                        recipeCandidates.push(jsonData as RecipeData);
                    }

                    // If there's an @graph array, search within it
                    if (jsonData['@graph']) {
                        const graphRecipe = jsonData['@graph'].find((item: { [x: string]: string; }) => item['@type'] === 'Recipe');
                        if (graphRecipe) {
                            recipeCandidates.push(graphRecipe as RecipeData);
                        }
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to parse JSON:', err);
                }
            }
        }
        recipeData = recipeCandidates
            .sort((left, right) => recipeScore(right) - recipeScore(left))[0] ?? {};
        recipeData.recipeInstructions = flattenInstructions(recipeData.recipeInstructions);
        if (recipeData.recipeInstructions.length < 2) {
            const visibleInstructions = await extractVisibleInstructions(page);
            if (visibleInstructions.length > recipeData.recipeInstructions.length) {
                recipeData.recipeInstructions = visibleInstructions;
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
        const newRecipe = await saveRecipe(decodeRecipeText(recipeData));
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