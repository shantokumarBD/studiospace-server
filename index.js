import express from "express";
import "dotenv/config";
import { MongoClient } from "mongodb";
import cors from "cors";


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// MongoDB Connection
const client = new MongoClient(process.env.DB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// Database & Collections 
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");


app.get("/", (req, res) => {
  res.send("StudioSpace server is running successfully!");
});


// Server Listen
app.listen(PORT, () => {
  console.log(`StudioSpace server running on port: ${PORT}`);
});