// src/utils/dbConnection.ts

import { MongoClient } from 'mongodb';

let db: any = null;

export async function connectToDatabase(): Promise<any> {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'; // Use environment variable or default
    const client = new MongoClient(uri);

    try {
        await client.connect();
        db = client.db('receptenApi'); // Assuming database name is 'receptenApi'
        console.log('Connected to MongoDB');

        // Check if the collection exists and create if necessary
        const collections = await db.listCollections({ name: 'recipes' }).toArray();

        if (collections.length === 0) {
            await db.createCollection('recipes');
            console.log('Collection created.');
        }
        return db;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw new Error("Database connection not established");
    }
}

export async function getDB() {
    if (!db) {
        await connectToDatabase();
    }
    return db;
}
