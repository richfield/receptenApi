import mongoose, { Schema, Document, Types } from 'mongoose';

export interface Role extends Document {
    name: string;
    _id: Types.ObjectId;
}

const RoleSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
});

export const RoleModel = mongoose.model<Role>('Role', RoleSchema);