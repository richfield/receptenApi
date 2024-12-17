import mongoose, { Schema } from 'mongoose';
import { RecipeData } from '../Types';

const VideoObjectSchema = new mongoose.Schema({
    '@type': { type: String, default: 'VideoObject' },
    name: String,
    description: String,
    thumbnailUrl: [String],
    contentUrl: String
});

const VideoSchema = new mongoose.Schema({
    video: {
        type: mongoose.Schema.Types.Mixed,
        set: (value: any) => {
            if (typeof value === 'string') {
                return { '@type': 'VideoObject', contentUrl: value };
            }
            return value;
        }
    }
});

/**
 * Define the schema without directly extending Document
 */
const RecipeSchema = new Schema<RecipeData>({
    '@context': { type: String, default: 'https://schema.org' },
    '@type': { type: String, default: 'Recipe' },
    author: {
        '@type': { type: String, default: 'Organization' },
        name: { type: String },
    },
    keywords: { type: [String], default: [] },
    image: {
        type: [String],
        default: [],
        set: (value: string | string[]) => {
            return Array.isArray(value) ? value : value.includes(',') ? value.split(',') : [value];
        },
    },
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
    recipeYield: {
        type: String,
        set: (value: string | string[]) => {
            if (Array.isArray(value)) {
                return value.join(', '); // Convert the array to a comma-separated string
            }
            return value;
        }
    },
    description: { type: String },
    recipeCategory: { type: [String], default: [] },
    recipeCuisine: { type: [String], default: [] },
    aggregateRating: {
        type: mongoose.Schema.Types.Mixed,
        set: (value: { [x: string]: string; }) => {
            if (typeof value === 'object' && value['@type'] === 'AggregateRating') {
                return value;
            }
            return { '@type': 'AggregateRating', ratingValue: value, ratingCount: 1 };
        }
    },
    video: VideoSchema
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
