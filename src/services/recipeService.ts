import { RecipeData } from "../Types";
import { getDB } from '../utils/dbConnection';
import { v4 as uuidv4 } from 'uuid';



export async function saveRecipe(recipeData: RecipeData) {
    const db = await getDB();
    const id = recipeData.id || uuidv4(); // Generate a new GUID if none exists
    recipeData.id = id;

    const existingRow = await db.collection('recipes').findOne({ id });
    if (existingRow) {
        await db.collection('recipes').updateOne({ id }, { $set: { data: recipeData } });
    } else {
        await db.collection('recipes').insertOne({ id, data: recipeData });
    }
}

export async function getRecipeById(id: string) {
    const db = await getDB();
    const recipeRow = await db.collection('recipes').findOne({ id });
    if (recipeRow) {
        return recipeRow.data;
    } else {
        throw new Error('Recipe not found by id');
    }
}

export async function getAllRecipes() {
    const db = await getDB();
    const recipes  = await db.collection('recipes').find().toArray();
    return recipes.map((row: { data: any; }) => row.data);
}

export async function searchRecipes(query: string) {
    const db = await getDB();
    const searchQuery = {
        $or: [
            { "data.name": { $regex: query, $options: 'i' } },
            { "data.description": { $regex: query, $options: 'i' } },
            {
                "data.recipeIngredient": {
                    $elemMatch: {
                        $regex: query,
                        $options: 'i'
                    }
                }
            },
            {
                "data.author.name": {
                    $regex: query,
                    $options: 'i'
                }
            }
        ]
    };
    const recipes = await db.collection('recipes').find(searchQuery).toArray();
    return recipes.map((row: { data: any; }) => row.data);
}


export async function deleteRecipe(id: string) {
    const db = await getDB();
    const result = await db.collection('recipes').deleteOne({ id });
    if (result.deletedCount === 0) {
        throw new Error('Recipe not found');
    }
}
