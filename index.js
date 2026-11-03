import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");
const studiosCollection = db.collection("studios");

app.get("/", (req, res) => {
  res.send("StudioSpace server is running successfully!");
});

app.get("/featured-studios", async (req, res) => {
  try {
    const result = await studiosCollection.find().sort({ rating: -1 }).limit(6).toArray();

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

app.get("/studios", async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    let query = {};

    if (category && category !== "All Categories") {
      query.category = category;
    }

    let result = await studiosCollection.find(query).toArray();

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((studio) =>
        studio.title.toLowerCase().includes(searchLower)
      );
    }

    if (sort === "rate-asc") {
      result.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sort === "rate-desc") {
      result.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sort === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    res.send({
      success: true,
      message: "Successfully fetched studios",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Studio not found",
      });
    }

    res.send({
      success: true,
      message: "Successfully fetched studio details",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.post("/studios", async (req, res) => {
  try {
    const studioData = {
      ...req.body,
      rating: 5.0,
      shootsCompleted: 0,
      isFeatured: false,
      createdAt: new Date(),
    };
    const result = await studiosCollection.insertOne(studioData);
    res.send({ success: true, data: result });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

app.get("/my-studios", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Owner email is required",
      });
    }

    const result = await studiosCollection.find({ ownerEmail: email }).toArray();

    res.send({
      success: true,
      message: "Successfully fetched my studios",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.delete("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });

    res.send({
      success: true,
      message: "Studio deleted successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.put("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    const result = await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.send({
      success: true,
      message: "Studio updated successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});



app.listen(PORT, () => {
  console.log(`StudioSpace server running on port: ${PORT}`);
});
