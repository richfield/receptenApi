import mongoose, { Schema } from 'mongoose';

// Define the Mongoose schema for DateLink
const dateLinkSchema = new Schema({
    date: { type: Date, required: true },
    recipe: {
        type: Schema.Types.ObjectId,
        ref: 'Recipe', // Reference the Recipe model
        required: true
    }
});

// Define the Mongoose model for DateLink
const DateLinkModel = mongoose.model('DateLink', dateLinkSchema);

export { DateLinkModel };
