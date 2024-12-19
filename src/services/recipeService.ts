import { RecipeData } from '../Types';
import RecipeModel from '../models/Recipe';
import mongoose from 'mongoose';
import axios from 'axios';
import { RecipeImageModel } from '../models/RecipeImageModel';

// Save or update a recipe
export async function saveRecipe(recipeData: RecipeData): Promise<RecipeData> {
    try {
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

        // // If image is not set, try to use the first URL from images
        // if (recipeData.images?.length) {
        //     const imageUrl = recipeData.images[0];
        //     console.log(imageUrl);
        //     try {
        //         await setImageByUrl(existingRecipe._id, imageUrl);
        //     } catch (error) {
        //         console.error(error)
        //     }
        // }
        recipeData._id = existingRecipe._id;
        await RecipeModel.updateOne(
            { _id: existingRecipe._id },
            { $set: recipeData }
        );
        return existingRecipe;

    } catch (error) {
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
        const response = await axios.get(url, { responseType: 'arraybuffer' });
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


    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error deleting recipe:', error);
        throw new Error('Failed to delete recipe');
    }
}

export const getImageById = async (id: string): Promise<Buffer | null> => {
    const recipeId = new mongoose.Types.ObjectId(id);
    const recipe = await RecipeImageModel.findOne({ recipeId });
    if (!recipe || !recipe.image) {
        return null;
    }

    return recipe.image;
};
