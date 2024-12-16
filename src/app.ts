import express from 'express';
import mongoose, { ConnectOptions } from "mongoose";
import recipeRoutes from "./routes/recipeRoutes";
import scrapeRoutes from "./routes/scrapeRoutes";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const options: ConnectOptions = {}
mongoose.connect(mongoURI,options)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.json());
// Connect to the database
app.use('/recipes', recipeRoutes);
app.use('/scrape', scrapeRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
