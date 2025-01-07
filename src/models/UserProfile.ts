import mongoose, { Schema, Document } from 'mongoose';

export interface UserProfile extends Document {
    firebaseUID: string;
    settings: Record<string, unknown>;
    roles: mongoose.Types.ObjectId[];
    groups: mongoose.Types.ObjectId[];
}

const UserSettingsSchema: Schema = new Schema({
    theme: { type: String, required: true },
    language: { type: String, enum: ['en', 'nl'], required: true }
});

const UserProfileSchema: Schema = new Schema({
    firebaseUID: { type: String, required: true, unique: true },
    settings: { type: UserSettingsSchema, required: true },
    roles: [{ type: String }],
    groups: [{ type: String }],
});

export const UserProfileModel = mongoose.model<UserProfile>('UserProfile', UserProfileSchema);