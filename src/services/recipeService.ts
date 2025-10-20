import { Instruction, RecipeData } from '../Types';
import RecipeModel from '../models/Recipe';
import mongoose from 'mongoose';
import axios from 'axios';
import { RecipeImageModel } from '../models/RecipeImageModel';

export class ImageNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageNotFoundError';
    }
}

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

export const getImageById = async (id: string): Promise<Buffer> => {
    const recipeId = new mongoose.Types.ObjectId(id);
    const recipe = await RecipeImageModel.findOne({ recipeId });
    if (!recipe || !recipe.image) {
        throw new ImageNotFoundError(`No image found for recipeId: ${recipeId}`);
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