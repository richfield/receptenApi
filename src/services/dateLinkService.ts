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

const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

const escapeIcalText = (text: string): string => {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .trim();
};

const foldIcalLine = (line: string): string => {
    const limit = 75;
    if (line.length <= limit) return line;

    let out = '';
    let pos = 0;

    while (pos < line.length) {
        const chunk = line.slice(pos, pos + limit);
        out += (pos === 0 ? chunk : '\r\n ' + chunk);
        pos += limit;
    }

    return out;
};

// ─────────────────────────────────────────────
// Main function
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

    const timestamp = new Date()
        .toISOString()
        .replace(/[-:.]/g, '')
        .slice(0, 15) + 'Z';

    const events = dateLinks.flatMap((link) => {
        const date = link._id;

        const startStr = formatDateLocal(date);
        const next = new Date(date);
        next.setDate(date.getDate() + 1);
        const endStr = formatDateLocal(next);

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
        'X-WR-CALNAME:Recepten Kalender',
        'NAME:Recepten Kalender',
        events,
        'END:VCALENDAR'
    ].join('\r\n');
};