import mongoose, { Schema } from 'mongoose';
import { RecipeData } from '../Types';

/**
 * Define the schema without directly extending Document
 */
const RecipeSchema = new Schema<RecipeData>({
    '@context': { type: String, default: 'https://schema.org' },
    '@type': { type: String, default: 'Recipe' },
    author: {
        '@type': { type: String, default: 'Organization' },
        name: { type: String, required: true },
    },
    keywords: { type: [String], default: [] },
    image: { type: [String], default: [] },
    recipeIngredient: { type: [String], default: [] },
    name: { type: String, required: true },
    url: { type: String },
    nutrition: {
        '@type': { type: String, default: 'NutritionInformation' },
        calories: { type: String },
        carbohydrateContent: { type: String },
        proteinContent: { type: String },
        fatContent: { type: String },
        saturatedFatContent: { type: String },
        transFatContent: { type: String },
        cholesterolContent: { type: String },
        sodiumContent: { type: String },
        fiberContent: { type: String },
        sugarContent: { type: String },
        unsaturatedFatContent: { type: String },
        servingSize: { type: String },
    },
    cookTime: { type: String },
    prepTime: { type: String },
    totalTime: { type: String },
    recipeInstructions: [
        {
            '@type': { type: String, default: 'HowToStep' },
            name: { type: String },
            text: { type: String },
        },
    ],
    recipeYield: { type: String },
    description: { type: String },
    recipeCategory: { type: [String], default: [] },
    recipeCuisine: { type: [String], default: [] },
    aggregateRating: { type: String },
    video: { type: String },
    //_id: { type: String, required: true, unique: true }, // Custom `id`
});

// Add a virtual `id` field to map `_id`
RecipeSchema.virtual('id').get(function () {
    return this.id.toHexString();
});

// Ensure virtuals are included in JSON output
RecipeSchema.set('toJSON', { virtuals: true });

/**
 * Create the Mongoose model
 */
const RecipeModel = mongoose.model<RecipeData>('Recipe', RecipeSchema);

export default RecipeModel;
