import mongoose, { Schema } from 'mongoose';

export type RecipeRatingDocument = {
    recipe: mongoose.Types.ObjectId;
    userId: string;
    value: number;
    createdAt?: Date;
    updatedAt?: Date;
};

const RecipeRatingSchema = new Schema<RecipeRatingDocument>({
    recipe: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
    userId: { type: String, required: true },
    value: { type: Number, required: true, min: 0.5, max: 5 },
}, {
    timestamps: true,
});

RecipeRatingSchema.index({ recipe: 1, userId: 1 }, { unique: true });

const RecipeRatingModel = mongoose.model<RecipeRatingDocument>('RecipeRating', RecipeRatingSchema);

export default RecipeRatingModel;
