import mongoose, { Schema, Document } from 'mongoose';

export interface RecipeImage extends Document {
    recipeId: string;
    image: Buffer;
}

const RecipeImageSchema: Schema = new Schema({
    recipeId: { type: String, required: true },
    image: { type: Buffer, required: true },
});

export const RecipeImageModel = mongoose.model<RecipeImage>('RecipeImage', RecipeImageSchema);