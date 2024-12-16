import express from 'express';
import recipeRoutes from "./routes/recipeRoutes";
import scrapeRoutes from "./routes/scrapeRoutes";
import { connectToDatabase } from './utils/dbConnection';

const app = express();
const port = process.env.PORT || 3000;
console.log({env: process.env})
connectToDatabase();

app.use(express.json());
// Connect to the database
app.use('/recipes', recipeRoutes);
app.use('/scrape', scrapeRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
