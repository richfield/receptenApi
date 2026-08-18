import LeftoverModel from '../models/Leftover';
import RecipeModel from '../models/Recipe';

export const addLeftover = async (recipeId: string, addedBy?: string, portion?: string) => {
  const recipe = await RecipeModel.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  const leftover = new LeftoverModel({ recipe: recipeId, addedBy, portion });
  await leftover.save();
  return leftover;
};

export const listLeftovers = async (opts?: { recipeId?: string; status?: 'inFreezer' | 'claimed' | 'all'; date?: string }) => {
  const { recipeId, status = 'inFreezer', date } = opts || {};
  const filter: any = {};
  if (recipeId) filter.recipe = recipeId;

  if (status === 'inFreezer') {
    filter.inFreezer = true;
  } else if (status === 'claimed') {
    filter.inFreezer = false;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.claimedAt = { $gte: start, $lte: end };
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

export const getLeftoverById = async (id: string) => {
  return LeftoverModel.findById(id).populate('recipe').exec();
};
