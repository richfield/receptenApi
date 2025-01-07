import { Request } from 'express';

export type RecipeData = {
    '@context'?: 'https://schema.org';
    '@type'?: 'Recipe';
    author?: {
        '@type': 'Organization';
        name: string;
    };
    keywords?: string | string[];
    image?: string;
    images?: string[];
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

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        [key: string]: unknown;
    };
}

type Language = 'en' | 'nl'

/**
 * Represents the settings associated with a user profile.
 */
export interface UserSettings {
    theme: string;
    language: Language;
}

/**
 * Represents a user profile in the application.
 */
export interface UserProfile {
    /**
     * Firebase User ID.
     */
    firebaseUID: string;

    /**
     * Dictionary of user settings.
     */
    settings: UserSettings;

    /**
     * Array of roles assigned to the user.
     */
    roles: string[];

    /**
     * Array of groups the user belongs to.
     */
    groups: string[];

    /**
     * Timestamp of when the profile was created.
     */
    createdAt: Date;

    /**
     * Timestamp of when the profile was last updated.
     */
    updatedAt: Date;
}

export interface RoleData {
    name: string;
}

export interface GroupData {
    name: string;
}