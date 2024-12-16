import { RecipeData } from "../Types";
import { getDB } from '../utils/dbConnection';
import { v4 as uuidv4 } from 'uuid';
import RecipeModel from "../models/Recipe";

// Save or update a recipe
export async function saveRecipe(recipeData: RecipeData) {
    const id = recipeData.id || uuidv4(); // Generate a new GUID if none exists
    recipeData.id = id;

    const existingRecipe = await RecipeModel.findOne({ id });
    if (existingRecipe) {
        await RecipeModel.updateOne({ id }, { $set: recipeData });
    } else {
        const newRecipe = new RecipeModel(recipeData);
        await newRecipe.save();
    }
}

// Get a recipe by its ID
export async function getRecipeById(id: string) {
    const recipe = await RecipeModel.findOne({ id });
    if (recipe) {
        return mapSingleImage(recipe.toObject());
    } else {
        throw new Error('Recipe not found by id');
    }
}

// Get all recipes
export async function getAllRecipes() {
    const recipes = await RecipeModel.find();
    return recipes.map((recipe: { toObject: () => RecipeData; }) => mapSingleImage(recipe.toObject()));
}

// Search recipes based on a query
export async function searchRecipes(query: string) {
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
                'author.name': {
                    $regex: query,
                    $options: 'i'
                }
            }
        ]
    };
    const recipes = await RecipeModel.find(searchQuery);
    return recipes.map((recipe: { toObject: () => RecipeData; }) => mapSingleImage(recipe.toObject()));
}

// Delete a recipe by its ID
export async function deleteRecipe(id: string) {
    const result = await RecipeModel.deleteOne({ id });
    if (result.deletedCount === 0) {
        throw new Error('Recipe not found');
    }
}

// Map single image from recipe data
function mapSingleImage(recipe: RecipeData): RecipeData {
    if (Array.isArray(recipe.image)) {
        recipe.image = recipe.image[0];
    }
    return recipe;
}
