import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

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
const bookingsCollection = db.collection("bookings");
const wishlistsCollection = db.collection("wishlists");

const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined") {
    return res.status(401).send({ success: false, message: "Unauthorized: Invalid token structure" });
  }

  

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    // console.log(payload);
    
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return res.status(401).send({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
};


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

app.post("/studios", verifyToken, async (req, res) => {
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

app.get("/my-studios", verifyToken, async (req, res) => {
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

app.delete("/studios/:id", verifyToken, async (req, res) => {
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

app.put("/studios/:id", verifyToken, async (req, res) => {
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



app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const { studioId, date, callTime, wrapTime } = req.body;
    if (studioId && date) {
      const existingBookings = await bookingsCollection.find({ studioId, date }).toArray();
      const conflict = existingBookings.some((b) => {
        const s = (b.status || "").toLowerCase();
        if (s.includes("cancel")) return false;
        if (!b.callTime || !b.wrapTime || !callTime || !wrapTime) return false;
        return callTime < b.wrapTime && wrapTime > b.callTime;
      });

      if (conflict) {
        return res.status(409).send({
          success: false,
          message: "Time slot collision: A reservation already exists for the selected hours.",
        });
      }
    }

    const bookingData = {
      ...req.body,
      status: req.body.status || "Pending",
      createdAt: new Date(),
    };
    const result = await bookingsCollection.insertOne(bookingData);
    res.send({
      success: true,
      message: "Studio booked successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Renter email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await bookingsCollection
      .find({ renterEmail: { $regex: `^${normalizedEmail}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      message: "Successfully fetched bookings",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.delete("/my-bookings/:id",verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    let result;
    if (permanent === "true") {
      result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Cancelled", cancelledAt: new Date() } }
      );
    }

    res.send({
      success: true,
      message: "Booking cancelled successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.post("/wishlist",verifyToken, async (req, res) => {
  try {
    const { studioId, userEmail } = req.body;
    if (!studioId || !userEmail) {
      return res.status(400).send({
        success: false,
        message: "Studio ID and user email are required",
      });
    }

    const existing = await wishlistsCollection.findOne({ studioId, userEmail });
    if (existing) {
      return res.send({
        success: true,
        message: "Studio already in wishlist",
        data: existing,
      });
    }

    const item = {
      ...req.body,
      createdAt: new Date(),
    };
    const result = await wishlistsCollection.insertOne(item);
    res.send({
      success: true,
      message: "Studio added to wishlist",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.get("/wishlist",verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    const result = await wishlistsCollection
      .find({ userEmail: { $regex: `^${email}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      message: "Successfully fetched wishlist",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.delete("/wishlist/:id",verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    let filter;
    if (ObjectId.isValid(id) && id.length === 24) {
      filter = { $or: [{ _id: new ObjectId(id) }, { studioId: id }] };
    } else {
      filter = { studioId: id };
    }

    const result = await wishlistsCollection.deleteOne(filter);
    res.send({
      success: true,
      message: "Studio removed from wishlist",
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

export default app;
