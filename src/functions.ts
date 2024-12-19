import { IRecipe } from 'html-recipe-parser/dist/interfaces';
import { RecipeData } from './Types';

export function convertIRecipeToRecipeData(recipe: IRecipe): RecipeData {
    return {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipe.name,
        url: recipe.sourceUrl,
        author: recipe.author ? { '@type': 'Organization', name: recipe.author } : undefined,
        keywords: recipe.keywords,
        images: Array.isArray(recipe.imageUrl) ? recipe.imageUrl : recipe.imageUrl?.includes(',') ? recipe.imageUrl.split(',') : recipe.imageUrl ? [recipe.imageUrl] : [],
        recipeIngredient: recipe.ingredients,
        recipeInstructions: recipe.instructions?.map(instruction => ({
            '@type': 'HowToStep',
            name: instruction,
            text: instruction
        })),
        recipeYield: recipe.yeld,
        nutrition: recipe.nutrition ? {
            '@type': 'NutritionInformation',
            calories: recipe.nutrition.calories || '',
            carbohydrateContent: recipe.nutrition.carbohydrateContent || '',
            proteinContent: recipe.nutrition.proteinContent || '',
            fatContent: recipe.nutrition.fatContent || '',
            saturatedFatContent: '',
            transFatContent: '',
            cholesterolContent: '',
            sodiumContent: '',
            fiberContent: recipe.nutrition.fiberContent || '',
            sugarContent: recipe.nutrition.sugarContent || '',
            unsaturatedFatContent: '',
            servingSize: ''
        } : undefined,
        cookTime: recipe.cookTime || '',
        prepTime: recipe.prepTime || '',
        totalTime: recipe.totalTime,
        recipeCategory: recipe.category,
        recipeCuisine: recipe.cuisine,
        aggregateRating: recipe.rating?.toString(),
        video: recipe.videoUrl,
    };
}