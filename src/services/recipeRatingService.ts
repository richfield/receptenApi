import mongoose from 'mongoose';
import RecipeRatingModel from '../models/RecipeRating';
import RecipeModel from '../models/Recipe';

const HALF_STEP = 0.5;

const clampRating = (value: number) => {
    const rounded = Math.round(value / HALF_STEP) * HALF_STEP;
    return Math.min(5, Math.max(0.5, rounded));
};

export const setRecipeRating = async (recipeId: string, userId: string, value: number) => {
    const ratingValue = clampRating(Number(value));
    const recipe = await RecipeModel.findById(recipeId);
    if (!recipe) {
        throw new Error('Recipe not found');
    }

    const rating = await RecipeRatingModel.findOneAndUpdate(
        { recipe: new mongoose.Types.ObjectId(recipeId), userId },
        { $set: { value: ratingValue } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return rating.toObject();
};

export const getRecipeRatings = async (recipeId: string) => {
    const rows = await RecipeRatingModel.find({ recipe: new mongoose.Types.ObjectId(recipeId) }).sort({ createdAt: -1 }).lean();
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const average = rows.length ? total / rows.length : 0;

    return {
        average: Number(average.toFixed(2)),
        count: rows.length,
        total,
        ratings: rows.map((row) => ({
            ...row,
            _id: row._id ? String(row._id) : undefined,
            recipe: String(row.recipe),
        })),
    };
};

export const getUserRatingForRecipe = async (recipeId: string, userId: string) => {
    const rating = await RecipeRatingModel.findOne({
        recipe: new mongoose.Types.ObjectId(recipeId),
        userId,
    }).lean();

    return rating ? { ...rating, _id: String(rating._id), recipe: String(rating.recipe) } : null;
};

export const getAllRecipeRatings = async () => {
    const rows = await RecipeRatingModel.find().lean();
    const grouped = new Map<string, { total: number; count: number }>();

    rows.forEach((row) => {
        const recipeId = String(row.recipe);
        const current = grouped.get(recipeId) || { total: 0, count: 0 };
        current.total += row.value;
        current.count += 1;
        grouped.set(recipeId, current);
    });

    return Array.from(grouped.entries()).map(([recipe, value]) => ({
        recipe,
        average: Number((value.total / value.count).toFixed(2)),
        count: value.count,
    }));
};
