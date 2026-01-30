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
// RFC5545 line folding: lines must be max 75 characters
const foldIcalLine = (line: string): string => {
    const limit = 75;
    if (line.length <= limit) return line;

    let result = '';
    let pos = 0;
    while (pos < line.length) {
        const chunk = line.slice(pos, pos + limit);
        result += (pos === 0 ? chunk : '\r\n ' + chunk);
        pos += limit;
    }
    return result;
};

// Safely escape newlines for DESCRIPTION fields
const escapeIcalText = (text: string): string => {
    return text
        .replace(/\r?\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .trim();
};

export const generateIcal = async () => {
    const now = new Date();

    // Start of last month
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
        const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '');
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const formattedNextDate = nextDate.toISOString().slice(0, 10).replace(/-/g, '');

        return link.recipes.map(recipe => {
            const description = escapeIcalText(recipe.description || 'No description available.');
            const summary = escapeIcalText(recipe.name || 'Untitled');
            const uid = `${recipe._id}_${formattedDate}`;

            return [
                'BEGIN:VEVENT',
                'CATEGORIES:Recipes',
                foldIcalLine(`DESCRIPTION:${description}`),
                `DTSTAMP:${timestamp}`,
                `DTSTART;VALUE=DATE:${formattedDate}`,
                `DTEND;VALUE=DATE:${formattedNextDate}`,
                'STATUS:CONFIRMED',
                foldIcalLine(`SUMMARY:${summary}`),
                `UID:${uid}`,
                'END:VEVENT'
            ].join('\r\n');
        });
    }).join('\r\n');

    return [
        'BEGIN:VCALENDAR',
        'PRODID:-//Your Organization//NONSGML v1.0//EN',
        'VERSION:2.0',
        'NAME:Recipe Schedule',
        'X-WR-CALNAME:Recipe Schedule',
        events,
        'END:VCALENDAR'
    ].join('\r\n');
};