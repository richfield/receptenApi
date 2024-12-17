import { RecipeData } from "../Types";
import RecipeModel from "../models/Recipe";
import mongoose from "mongoose";

// Save or update a recipe
export async function saveRecipe(recipeData: RecipeData) {
    try {
        const existingRecipe = await RecipeModel.findOne({ name: recipeData.name });
        if (existingRecipe) {
            await RecipeModel.updateOne({ name: recipeData.name }, { $set: recipeData });
            return existingRecipe.toObject();
        } else {
            const newRecipe = new RecipeModel(recipeData);
            const saved = await newRecipe.save();
            return saved.toObject();
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        throw new Error('Failed to save recipe');
    }
}

// Get a recipe by its ID
export async function getRecipeById(findId: string) {
    try {
        const _id = new mongoose.Types.ObjectId(findId);
        console.log({id: _id})
        const recipe = await RecipeModel.findOne({ _id });
        console.log({recipe})
        if (recipe) {
            return recipe.toObject();
        } else {
            throw new Error('Recipe not found by id');
        }
    } catch (error) {
        console.error('Error getting recipe by ID:', error);
        throw new Error('Failed to retrieve recipe');
    }
}

// Get all recipes
export async function getAllRecipes() {
    try {
        const recipes = await RecipeModel.find();
        console.log({recipes})
        return recipes.map((recipe: { toObject: () => RecipeData; }) => recipe.toObject());
    } catch (error) {
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
                    'author.name': {
                        $regex: query,
                        $options: 'i'
                    }
                }
            ]
        };
        const recipes = await RecipeModel.find(searchQuery);
        return recipes.map((recipe: { toObject: () => RecipeData; }) => recipe.toObject());
    } catch (error) {
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
    } catch (error) {
        console.error('Error deleting recipe:', error);
        throw new Error('Failed to delete recipe');
    }
}