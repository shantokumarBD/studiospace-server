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
const studiosCollection = db.collection("studios");


app.get("/", (req, res) => {
  res.send("StudioSpace server is running successfully!");
});

app.get("/featured-studios", async (req, res) => {
  try {
    const result = await studiosCollection.find().limit(6).toArray();

    res.send({
      success: true,
      message: "Successfully fetched featured studios",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});



// Server Listen
app.listen(PORT, () => {
  console.log(`StudioSpace server running on port: ${PORT}`);
});