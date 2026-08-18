import mongoose, { Schema } from 'mongoose';

const LeftoverSchema = new Schema({
  recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  addedBy: { type: String },
  addedAt: { type: Date, default: () => new Date() },
  portion: { type: String },
  inFreezer: { type: Boolean, default: true },
  claimedBy: { type: String, default: null },
  claimedAt: { type: Date, default: null }
});

LeftoverSchema.set('toJSON', { virtuals: true });

const LeftoverModel = mongoose.model('Leftover', LeftoverSchema);

export default LeftoverModel;
export { LeftoverModel };
