import { Instruction, RecipeData } from '../Types';
import RecipeModel from '../models/Recipe';
import mongoose from 'mongoose';
import axios from 'axios';
import { RecipeImageModel } from '../models/RecipeImageModel';

// Save or update a recipe
export async function saveRecipe(recipe: RecipeData): Promise<RecipeData> {
    try {
        const recipeData = fixRecipe(recipe);
        let existingRecipe = null;

        // Check if a recipe exists by ID
        if (recipeData._id) {
            existingRecipe = await RecipeModel.findById(recipeData._id);
        }
        // If no recipe is found by ID, check by name
        if (!existingRecipe) {
            existingRecipe = await RecipeModel.findOne({ name: recipeData.name });
        }

        if (!existingRecipe) {
            const newRecipe = new RecipeModel(recipeData);
            await newRecipe.save();
            existingRecipe = newRecipe;
        }

        recipeData._id = existingRecipe._id;
        await RecipeModel.updateOne(
            { _id: existingRecipe._id },
            { $set: recipeData }
        );
        return existingRecipe;

    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            throw new Error(`Error saving recipe: ${error.message}`);
        } else {
            throw new Error('Error saving recipe');
        }
    }
}

// Set image by recipeId and URL
export async function setImageByUrl(recipeId: string, url: string) {
    try {

        const existingImage = await RecipeImageModel.findOne({ recipeId });
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': url
            }
        });
        const imageBuffer = Buffer.from(response.data);

        if (existingImage) {
            await RecipeImageModel.updateOne(
                { recipeId },
                { $set: { image: imageBuffer } }
            );
            return existingImage.toObject();
        } else {
            const newImage = new RecipeImageModel({ recipeId, image: imageBuffer });
            await newImage.save();
            return newImage.toObject();
        }


    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        // eslint-disable-next-line no-console
        console.error('Error setting image by URL:', error);
        throw new Error('Failed to set image');
    }
}

// Set image by recipeId and file upload
export async function setImageByFile(recipeId: string, imageBuffer: Buffer) {
    try {
        const existingImage = await RecipeImageModel.findOne({ recipeId });

        if (existingImage) {
            await RecipeImageModel.updateOne(
                { recipeId },
                { $set: { image: imageBuffer } }
            );
        } else {
            const newImage = new RecipeImageModel({ recipeId, image: imageBuffer });
            await newImage.save();
        }
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        if (error instanceof Error) {
            throw new Error(`Error setting image by file: ${error.message}`);
        } else {
            throw new Error('Error setting image by file');
        }
    }
}

// Get a recipe by its ID
export async function getRecipeById(findId: string) {
    try {
        const _id = new mongoose.Types.ObjectId(findId);
        const recipe = await RecipeModel.findOne({ _id });
        if (recipe) {
            return recipe.toObject();
        } else {
            throw new Error('Recipe not found by id');
        }
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        // eslint-disable-next-line no-console
        console.error('Error getting recipe by ID:', error);
        throw new Error('Failed to retrieve recipe');
    }
}

// Get all recipes
export async function getAllRecipes() {
    try {
        const recipes = await RecipeModel.find();
        return recipes.map((recipe: { toObject: () => RecipeData; }) => recipe.toObject());
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        // eslint-disable-next-line no-console
        console.error('Error getting all recipes:', error);
        throw new Error('Failed to retrieve recipes');
    }
}

// Search recipes based on a query
export async function searchRecipes(query: string) {
    try {
        const searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                {
                    recipeIngredient: {
                        $elemMatch: {
                            $regex: query,
                            $options: 'i'
                        }
                    }
                },
                {
                    keywords: {
                        $elemMatch: {
                            $regex: query,
                            $options: 'i'
                        }
                    }
                },
                {
                    'author.name': {
                        $regex: query,
                        $options: 'i'
                    }
                }
            ]
        };
        const recipes = await RecipeModel.find(searchQuery);
        return recipes.map((recipe: { toObject: () => RecipeData; }) => recipe.toObject());
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        // eslint-disable-next-line no-console
        console.error('Error searching recipes:', error);
        throw new Error('Failed to search recipes');
    }
}

// Delete a recipe by its ID
export async function deleteRecipe(id: string) {
    try {
        const _id = new mongoose.Types.ObjectId(id);
        const result = await RecipeModel.deleteOne({ _id });
        if (result.deletedCount === 0) {
            throw new Error('Recipe not found');
        }
    // eslint-disable-next-line no-console
    } catch (error) { console.error(error)
        // eslint-disable-next-line no-console
        console.error('Error deleting recipe:', error);
        throw new Error('Failed to delete recipe');
    }
}

export const getImageById = async (id: string): Promise<Buffer | null> => {
    const recipeId = new mongoose.Types.ObjectId(id);
    const recipe = await RecipeImageModel.findOne({ recipeId });
    if (!recipe || !recipe.image) {
        // Return a default base64 image when no image is found
        return Buffer.from('data:image/jpeg;base64,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'); // Truncated base64 data
    }

    return recipe.image;
};

function fixRecipe(recipe: RecipeData) {
    const defaultRecipe: RecipeData = {
        name: '',
        description: '',
        keywords: [],
        recipeCategory: [],
        recipeCuisine: [],
        cookTime: '',
        totalTime: '',
        prepTime: '',
        recipeIngredient: [],
    };

    recipe = { ...defaultRecipe, ...recipe };
    if (Array.isArray(recipe.keywords) && recipe.keywords.length === 1 && recipe.keywords[0].includes(',')) {
        recipe.keywords = recipe.keywords[0].split(',');
    }
    if (Array.isArray(recipe.recipeCategory) && recipe.recipeCategory.length === 1 && recipe.recipeCategory[0].includes(',')) {
        recipe.recipeCategory = recipe.recipeCategory[0].split(',');
    }
    if (Array.isArray(recipe.recipeCuisine) && recipe.recipeCuisine.length === 1 && recipe.recipeCuisine[0].includes(',')) {
        recipe.recipeCuisine = recipe.recipeCuisine[0].split(',');
    }

    if(recipe.video === '') {
        recipe.video = undefined
    }

    recipe.images = recipe.images?.filter(f => f);

    if (!Array.isArray(recipe.recipeInstructions)) {
        const instructions = (recipe.recipeInstructions ?? '').split('.');
        recipe.recipeInstructions = instructions.map(i => ({
            '@type': 'HowToStep',
            name: i,
            text: i
        }));
    } else if (Array.isArray(recipe.recipeInstructions) && recipe.recipeInstructions.every(i => typeof i === 'string')) {
        recipe.recipeInstructions = recipe.recipeInstructions.map(i => {
            return ({
                '@type': 'HowToStep',
                name: typeof i === 'string' ? i : '',
                text: typeof i === 'string' ? i : ''
            });
        });
    }

    if (Array.isArray(recipe.recipeInstructions)) {
        const allSteps : Instruction[] = [];

        recipe.recipeInstructions.forEach(section => {
            if (
                section['@type'] === 'HowToSection' &&
                Array.isArray(section.itemListElement)
            ) {
                section.itemListElement.forEach(step => {
                    if (step['@type'] === 'HowToStep') {
                        allSteps.push(step);
                    }
                });
            } else if (section['@type'] === 'HowToStep') {
                // In case there are HowToSteps directly in recipeInstructions
                allSteps.push(section);
            }
        });

        recipe.recipeInstructions = allSteps;
    }

    if(Array.isArray(recipe.ingredients)) {
        recipe.recipeIngredient = recipe.ingredients.map(i => i)
    }

    if (needsConversion(recipe.cookTime)) {
        recipe.cookTime = toISO8601Duration(recipe.cookTime);
    }
    if (needsConversion(recipe.totalTime)) {
        recipe.totalTime = toISO8601Duration(recipe.totalTime);
    }
    if (needsConversion(recipe.prepTime)) {
        recipe.prepTime = toISO8601Duration(recipe.prepTime);
    }
    return recipe;
}

/**
 * Checks if the input matches the regex for minutes or hours
 * @param {string} input - The input string to check
 * @returns {boolean} - True if the input needs conversion, false otherwise
 */
function needsConversion(input: string | undefined): boolean {
    const regex = /(\d+)\s*(minutes|minuten|minute|min|hours|uur|uren|hour|h)/i;
    return input !== undefined && regex.test(input);
}

/**
 * Converts a valid input to ISO 8601 duration format
 * @param {string} input - The input string to convert
 * @returns {string} - ISO 8601 duration format
 * @throws {Error} - If the input format is invalid
 */
function toISO8601Duration(input: string | undefined): string {
    const regex = /(\d+)\s*(minutes|minuten|minute|min|hours|uur|uren|hour|h)/i;
    const match = input?.match(regex);

    if (!match) {
        // eslint-disable-next-line no-console
        console.error('Invalid input format for conversion');
        return input || '';
    }

    const value = parseInt(match[1], 10); // Extract the numeric value
    const unit = match[2].toLowerCase(); // Normalize unit to lowercase

    // Determine the ISO 8601 format based on the unit
    if (['minutes', 'minuten', 'minute', 'min'].includes(unit)) {
        return `PT${value}M`; // Minutes
    } else if (['hours', 'uur', 'uren', 'hour', 'h'].includes(unit)) {
        return `PT${value}H`; // Hours
    } else {
        // eslint-disable-next-line no-console
        console.error('Unsupported time unit');
        return input || '';
    }
}