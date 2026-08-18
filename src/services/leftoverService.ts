import LeftoverModel from '../models/Leftover';
import RecipeModel from '../models/Recipe';

export const addLeftover = async (recipeId: string, addedBy?: string, portion?: string) => {
  const recipe = await RecipeModel.findById(recipeId);
  if (!recipe) throw new Error('Recipe not found');

  const leftover = new LeftoverModel({ recipe: recipeId, addedBy, portion });
  await leftover.save();
  return leftover;
};

export const listFreezerLeftovers = async (recipeId?: string) => {
  const filter: any = { inFreezer: true };
  if (recipeId) filter.recipe = recipeId;
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
