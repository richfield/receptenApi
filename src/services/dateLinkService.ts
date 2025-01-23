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

    const icalData = dateLinks.map((link: DatesResponse) => {
        const { _id, recipes } = link;

        // For each recipe on the same date, generate a VEVENT
        return recipes.map((recipe) => {
            const formattedDate = _id.toISOString().split('T')[0]; // Use only the date part (YYYY-MM-DD)

            return `
BEGIN:VEVENT
SUMMARY:${recipe.name}
DTSTART;VALUE=DATE:${formattedDate}
DTEND;VALUE=DATE:${formattedDate}
END:VEVENT
            `;
        }).join('\n');
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example Corp//NONSGML v1.0//EN
${icalData}
END:VCALENDAR`;
};

