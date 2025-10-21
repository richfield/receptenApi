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
// Service to generate iCal data with multiple recipes per date as all-day events
export const generateIcal = async () => {
    const dateLinks: DatesResponse[] = await DateLinkModel.aggregate([
        { $lookup: { from: 'recipes', localField: 'recipe', foreignField: '_id', as: 'recipe' } },
        { $unwind: '$recipe' }, // Deconstruct recipe array
        { $group: { _id: '$date', recipes: { $push: '$recipe' } } },
        { $sort: { _id: 1 } }
    ]);

    const icalData = dateLinks.flatMap((link: DatesResponse) => {
        const { _id, recipes } = link;
        const formattedDate = _id.toISOString().split('T')[0];
        const oneDayLater = new Date(_id);
        oneDayLater.setDate(_id.getDate() + 1);
        const formattedNextDate = oneDayLater.toISOString().split('T')[0];
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

        return recipes.map((recipe) => `
BEGIN:VEVENT
CATEGORIES:Recipes
DESCRIPTION:${recipe.description || 'No description available.'}
DTSTAMP:${timestamp}
DTSTART;VALUE=DATE:${formattedDate}
DTEND;VALUE=DATE:${formattedNextDate}
STATUS:CONFIRMED
SUMMARY:${recipe.name}
UID:${recipe._id || `recipe_${formattedDate}_${Math.random().toString(36).substr(2, 9)}`}
END:VEVENT
    `);
    }).join('\n');

    return `BEGIN:VCALENDAR
NAME:Recipe Schedule
X-WR-CALNAME:Recipe Schedule
PRODID:-//Your Organization//NONSGML v1.0//EN
VERSION:2.0
${icalData}
END:VCALENDAR`;
};
