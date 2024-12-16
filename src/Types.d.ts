export type RecipeData = {
    '@context'?: 'https://schema.org';
    '@type'?: 'Recipe';
    author?: {
        '@type': 'Organization';
        name: string;
    };
    keywords?: string | string[];
    image?: string | string[];
    recipeIngredient?: string[];
    name?: string;
    url?: string;
    nutrition?: {
        '@type': 'NutritionInformation';
        calories: string;
        carbohydrateContent: string,
        proteinContent: string,
        fatContent: string,
        saturatedFatContent: string,
        transFatContent: string,
        cholesterolContent: string,
        sodiumContent: string,
        fiberContent: string,
        sugarContent: string,
        unsaturatedFatContent: string,
        servingSize: string
    };
    cookTime?: string; // Can be an empty string if not provided
    prepTime?: string; // Can be an empty string if not provided
    totalTime?: string;
    recipeInstructions?: {
        '@type': 'HowToStep';
        name: string;
        text: string;
    }[];
    recipeYield?: string;
    description?: string;
    recipeCategory?: string | string[];
    recipeCuisine?: string | string[];
    aggregateRating?: string; // Optional field
    video?: string | VideoObject; // Optional field
    _id?: string;
};

type VideoObject = {
    '@type': 'VideoObject';
    name?: string
    description?: string;
    thumbnailUrl?: string[],
    contentUrl?: string
}