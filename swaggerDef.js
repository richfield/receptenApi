module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'receptenApi',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI spec from route JSDoc comments'
  },
  servers: [
    { url: 'http://localhost:3000' }
  ],
  components: {
    schemas: {
      RecipeData: {
        type: 'object',
        description: 'Recipe data (partial)',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } }
        }
      },
      UserProfile: {
        type: 'object',
        properties: {
          firebaseUID: { type: 'string' },
          settings: { type: 'object' },
          roles: { type: 'array', items: { type: 'string' } },
          groups: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  paths: {
    '/recipes': {
      get: {
        summary: 'Get all recipes',
        responses: { '200': { description: 'Array of recipes' } }
      }
    },
    '/recipes/get/{id}': {
      get: {
        summary: 'Get a recipe by id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'The recipe' } }
      }
    },
    '/recipes/save': {
      post: {
        summary: 'Save a recipe',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecipeData' } } } },
        responses: { '200': { description: 'Saved result' } }
      }
    },
    '/profile/me': {
      get: {
        summary: "Get the authenticated user's profile",
        responses: { '200': { description: 'User profile' } }
      },
      post: {
        summary: "Update the authenticated user's profile",
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
        responses: { '200': { description: 'Updated profile' } }
      }
    }
  }
};
