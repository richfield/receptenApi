import { DateLinkModel } from '../models/DateLink';
import RecipeModel from '../models/Recipe';
import { DatesResponse } from '../Types';

export const linkRecipeToDate = async (date: Date, recipeId: string) => {
    const recipe = await RecipeModel.findById(recipeId);
    if (!recipe) throw new Error('Recipe not found');

    // Check if the link already exists
    const existingLink = await DateLinkModel.findOne({ date, recipe: recipeId });
    if (existingLink) throw new Error('Recipe already linked to this date');

    const dateLink = new DateLinkModel({
        date,
        recipe: recipeId
    });

    await dateLink.save();
    return dateLink;
};


// Service to unlink a recipe from a date
export const unlinkRecipeFromDate = async (date: Date, recipeId: string) => {
    const dateLink = await DateLinkModel.findOneAndDelete({ date, recipe: recipeId });
    if (!dateLink) throw new Error('Recipe not linked to this date');

    return dateLink;
};

export const getFirstRecipeForToday = async (date: Date): Promise<string | null> => {
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const link = await DateLinkModel
        .findOne({ date: { $gte: start, $lte: end } })
        .sort({ date: 1 })
        .populate('recipe')
        .exec();

    return link && link.recipe ? (link.recipe._id.toString()) : null;
};

// Service to get all dates with their linked recipes
export const getDatesWithRecipes = async (): Promise<DatesResponse[]> => {
    const dateLinks = await DateLinkModel.aggregate([
        { $lookup: { from: 'recipes', localField: 'recipe', foreignField: '_id', as: 'recipe' } },
        { $unwind: '$recipe' }, // Deconstruct recipe array
        { $group: { _id: '$date', recipes: { $push: '$recipe' } } },
        { $sort: { _id: 1 } }
    ]);
    return dateLinks;
};
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Format as YYYYMMDD in local time (en-CA gives ISO yyyy-mm-dd)
const toLocalDateString = (d: Date): string => {
    return d
        .toLocaleDateString('en-CA')   // timezone-safe, gives yyyy-mm-dd
        .replace(/-/g, '');            // ICS requires yyyymmdd
};

// Escape reserved ICS characters and convert newlines → \n
const escapeIcalText = (text: string): string => {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .trim();
};

// RFC5545: fold long lines at 75 chars
const foldIcalLine = (line: string): string => {
    const limit = 75;
    if (line.length <= limit) return line;

    let out = '';
    let pos = 0;

    while (pos < line.length) {
        const chunk = line.slice(pos, pos + limit);
        out += pos === 0 ? chunk : '\r\n ' + chunk;
        pos += limit;
    }
    return out;
};

// ─────────────────────────────────────────────
// Main ICS Generator
// ─────────────────────────────────────────────

export const generateIcal = async () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const dateLinks: DatesResponse[] = await DateLinkModel.aggregate([
        { $match: { date: { $gte: lastMonthStart } } },
        {
            $lookup: {
                from: 'recipes',
                localField: 'recipe',
                foreignField: '_id',
                as: 'recipe'
            }
        },
        { $unwind: '$recipe' },
        {
            $group: {
                _id: '$date',
                recipes: { $push: '$recipe' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // ICS timestamp
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:.]/g, '')
        .slice(0, 15) + 'Z';

    const events = dateLinks.flatMap((link) => {
        // Convert MongoDB UTC timestamp → local date
        // (No timezone math needed, JS Date already handles it)
        const dbDate =  new Date(link._id);
        const localDate = new Date(dbDate);
        localDate.setDate(dbDate.getDate() + 1);
        const startStr = toLocalDateString(localDate);

        const next = new Date(localDate);
        next.setDate(localDate.getDate() + 1);
        const endStr = toLocalDateString(next);

        return link.recipes.map((recipe) => {
            const recipeUrl = `https://recepten.ten-velde.com/recipe/${recipe._id}`;

            const descriptionText =
                (recipe.description?.trim() || 'Geen beschrijving beschikbaar.') +
                `\nRecept: ${recipeUrl}`;

            const description = escapeIcalText(descriptionText);
            const summary = escapeIcalText(recipe.name || 'Onbekend gerecht');

            const uid = `${recipe._id}_${startStr}`;

            return [
                'BEGIN:VEVENT',
                'CATEGORIES:Recipes',
                foldIcalLine(`URL:${recipeUrl}`),
                foldIcalLine(`DESCRIPTION:${description}`),
                `DTSTAMP:${timestamp}`,
                `DTSTART;VALUE=DATE:${startStr}`,
                `DTEND;VALUE=DATE:${endStr}`,
                'STATUS:CONFIRMED',
                foldIcalLine(`SUMMARY:${summary}`),
                `UID:${uid}`,
                'END:VEVENT'
            ].join('\r\n');
        });
    }).join('\r\n');

    return [
        'BEGIN:VCALENDAR',
        'PRODID:-//Ten Velde Recepten//ICS Generator//NL',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',

        // Calendar name shown in Google Calendar
        'X-WR-CALNAME:Recepten Kalender',
        'NAME:Recepten Kalender',

        events,
        'END:VCALENDAR'
    ].join('\r\n');
};