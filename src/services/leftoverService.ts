import LeftoverModel from '../models/Leftover';
import RecipeModel from '../models/Recipe';
import moment from 'moment';

export const addLeftover = async (recipeId: string, addedBy?: string, portion?: string) => {
  const recipe = await RecipeModel.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  const leftover = new LeftoverModel({ recipe: recipeId, addedBy, portion });
  await leftover.save();
  return leftover;
};

export const listLeftovers = async (opts?: { recipeId?: string; status?: 'inFreezer' | 'claimed' | 'all'; start?: string; end?: string }) => {
  const { recipeId, status = 'inFreezer', start, end } = opts || {};
  const filter: any = {};
  if (recipeId) filter.recipe = recipeId;

  if (status === 'inFreezer') {
    filter.inFreezer = true;
  } else if (status === 'claimed') {
    filter.inFreezer = false;
    if (start || end) {
      // parse as UTC to avoid timezone shifts
      const s = start ? moment.utc(start).toDate() : new Date(0);
      const e = end ? moment.utc(end).toDate() : new Date();
      filter.claimedAt = { $gte: s, $lte: e };
    }
  }

  return LeftoverModel.find(filter).populate('recipe').exec();
};

export const claimLeftover = async (leftoverId: string, userId: string) => {
  // Atomically claim a leftover that is still in the freezer
  const updated = await LeftoverModel.findOneAndUpdate(
    { _id: leftoverId, inFreezer: true },
    { $set: { inFreezer: false, claimedBy: userId, claimedAt: new Date() } },
    { new: true }
  ).populate('recipe').exec();

  if (!updated) throw new Error('Leftover not available');
  return updated;
};

export const unclaimLeftover = async (leftoverId: string, userId: string) => {
  // Only allow the user who claimed it to unclaim it. Set it back to inFreezer.
  const updated = await LeftoverModel.findOneAndUpdate(
    { _id: leftoverId, inFreezer: false, claimedBy: userId },
    { $set: { inFreezer: true, claimedBy: null, claimedAt: null } },
    { new: true }
  ).populate('recipe').exec();

  if (!updated) throw new Error('Unable to unclaim leftover (not claimed by user or not found)');
  return updated;
};

export const getLeftoverById = async (id: string) => {
  return LeftoverModel.findById(id).populate('recipe').exec();
};

export const deleteLeftover = async (leftoverId: string) => {
  // Delete the leftover document
  const found = await LeftoverModel.findById(leftoverId).exec();
  if (!found) throw new Error('Leftover not found');
  await LeftoverModel.deleteOne({ _id: leftoverId }).exec();
  return found;
};
