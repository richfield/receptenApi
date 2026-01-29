import mongoose, { Schema, Document } from 'mongoose';

export interface Group extends Document {
    name: string;
}

const GroupSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
});

export const GroupModel = mongoose.model<Group>('Group', GroupSchema);