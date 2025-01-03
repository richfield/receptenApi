/* eslint-disable no-console */
import express from 'express';

import mongoose, { ConnectOptions } from 'mongoose';
import recipeRoutes from './routes/recipeRoutes';
import scrapeRoutes from './routes/scrapeRoutes';
import admin from 'firebase-admin';
import { Response, NextFunction } from 'express';
import serviceAccount from './serviceAccountKey.json';
import { AuthenticatedRequest } from './Types';
import profileRoutes from './routes/profileRoutes';


const app = express();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<void | express.Response<any, Record<string, any>>> => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Attach decoded token to `req.user`
        return next(); // Proceed to the next middleware or route handler
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, next).catch(next);
});
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://debian.ten-velde.com:32768';
const options: ConnectOptions = {
    dbName: 'receptenApi'
}
mongoose.connect(mongoURI, options)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to the database
app.use('/recipes', recipeRoutes);
app.use('/scrape', scrapeRoutes);
app.use('/profile', profileRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
