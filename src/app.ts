import express from 'express';
import recipeRoutes from "./routes/recipeRoutes";
import scrapeRoutes from "./routes/scrapeRoutes";
import { connectToDatabase, getDB } from './utils/dbConnection';

const app = express();
const port = 3000;
connectToDatabase();

app.use(express.json());
// Connect to the database
app.use('/recipes', recipeRoutes);
app.use('/scrape', scrapeRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});