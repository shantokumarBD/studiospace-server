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
  } catch (err) {
    console.error("MongoDB connection notice:", err.message);
  }
  return client;
}

await connectToMongoDB();
const db = client.db("studiospace");
const studiosCollection = db.collection("studios");
const bookingsCollection = db.collection("bookings");
const wishlistsCollection = db.collection("wishlists");
const reviewsCollection = db.collection("reviews");

const jwksUrl =
  process.env.JWKS_URL ||
  "https://studiospace-client-bd.vercel.app/api/auth/jwks";
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .send({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined") {
    return res.status(401).send({
      success: false,
      message: "Unauthorized: Invalid token structure",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    // console.log(payload);

    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return res.status(401).send({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

app.get("/", (req, res) => {
  res.send("StudioSpace server is running successfully!");
});

app.get("/featured-studios", async (req, res) => {
  try {
    const result = await studiosCollection
      .find()
      .sort({ rating: -1 })
      .limit(6)
      .toArray();

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
        studio.title.toLowerCase().includes(searchLower),
      );
    }

    if (sort === "rate-asc") {
      result.sort((a, b) => (Number(a.hourlyRate) || 0) - (Number(b.hourlyRate) || 0));
    } else if (sort === "rate-desc") {
      result.sort((a, b) => (Number(b.hourlyRate) || 0) - (Number(a.hourlyRate) || 0));
    } else if (sort === "rating") {
      result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
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

app.get("/studios/:id/booked-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await bookingsCollection
      .find({
        studioId: id,
        status: { $nin: ["Cancelled", "Rejected", "cancelled", "rejected"] },
      })
      .project({ date: 1, callTime: 1, wrapTime: 1, status: 1 })
      .toArray();

    res.send({
      success: true,
      data: bookings,
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

    const result = await studiosCollection
      .find({ ownerEmail: email })
      .toArray();

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
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid studio ID format" });
    }
    const studio = await studiosCollection.deleteOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res
        .status(404)
        .send({ success: false, message: "Studio not found" });
    }

    if (studio.ownerEmail !== req.user?.email) {
      return res.status(403).send({
        success: false,
        message: "Forbidden: You are not authorized to delete this studio",
      });
    }

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

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid studio ID format" });
    }

    const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });
    if (!studio) {
      return res
        .status(404)
        .send({ success: false, message: "Studio not found" });
    }

    if (studio.ownerEmail !== req.user?.email) {
      return res.status(403).send({
        success: false,
        message: "Forbidden: You are not authorized to edit this studio",
      });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.ownerEmail;

    const result = await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
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
      const existingBookings = await bookingsCollection
        .find({ studioId, date })
        .toArray();
      const conflict = existingBookings.some((b) => {
        const s = (b.status || "").toLowerCase();
        if (s.includes("cancel") || s.includes("reject")) return false;
        if (!b.callTime || !b.wrapTime || !callTime || !wrapTime) return false;
        return callTime < b.wrapTime && wrapTime > b.callTime;
      });

      if (conflict) {
        return res.status(409).send({
          success: false,
          message:
            "Time slot collision: A reservation already exists for the selected hours.",
        });
      }
    }

    let ownerEmail = req.body.ownerEmail;
    if (!ownerEmail && studioId && ObjectId.isValid(studioId)) {
      const studio = await studiosCollection.findOne({
        _id: new ObjectId(studioId),
      });
      if (studio) {
        ownerEmail =
          studio.ownerEmail || studio.userEmail || studio.owner?.email;
      }
    }

    const bookingData = {
      ...req.body,
      ownerEmail: ownerEmail || req.body.ownerEmail || "",
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

app.get("/host-bookings", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Host email is required",
      });
    }

    const query = { ownerEmail: email };
    const result = await bookingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      message: "Successfully fetched host booking requests",
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

app.patch("/bookings/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).send({
        success: false,
        message: "Status is required",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid booking ID format" });
    }

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res
        .status(404)
        .send({ success: false, message: "Booking not found" });
    }

    if (booking.ownerEmail !== req.user?.email) {
      return res.status(403).send({
        success: false,
        message:
          "Forbidden: You are not authorized to update this booking status",
      });
    }

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
    );

    res.send({
      success: true,
      message: `Booking status updated to ${status}`,
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

    const query = { renterEmail: email };
    const result = await bookingsCollection
      .find(query)
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

app.delete("/my-bookings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid booking ID format" });
    }

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res
        .status(404)
        .send({ success: false, message: "Booking not found" });
    }

    if (
      booking.renterEmail !== req.user?.email &&
      booking.ownerEmail !== req.user?.email
    ) {
      return res
        .status(403)
        .send({
          success: false,
          message: "Forbidden: You are not authorized to cancel this booking",
        });
    }

    let result;
    if (permanent === "true") {
      result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Cancelled", cancelledAt: new Date() } },
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

app.post("/wishlist", verifyToken, async (req, res) => {
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

app.get("/wishlist", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    const query = { userEmail: email };
    const result = await wishlistsCollection
      .find(query)
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

app.delete("/wishlist/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { studioId: id };

    const result = await wishlistsCollection.deleteOne(query);
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

// 16. Get Reviews for Studio
app.get("/studios/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await reviewsCollection
      .find({ studioId: id })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      message: "Successfully fetched studio reviews",
      data: reviews,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// 17. Submit Review for Studio (Protected)
app.post("/studios/:id/reviews", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment || !comment.trim()) {
      return res.status(400).send({
        success: false,
        message: "Star rating and review feedback are required",
      });
    }

    const numericRating = Math.min(Math.max(Number(rating) || 5, 1), 5);

    const reviewDoc = {
      studioId: id,
      userEmail: req.user?.email || "creator@production.io",
      userName: req.user?.name || "Verified Creator",
      userImage: req.user?.image || "",
      rating: numericRating,
      comment: comment.trim(),
      createdAt: new Date(),
    };

    const insertResult = await reviewsCollection.insertOne(reviewDoc);

    // Recalculate studio average rating
    const allReviews = await reviewsCollection.find({ studioId: id }).toArray();
    const avgRating =
      allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
      allReviews.length;
    const roundedRating = Number(avgRating.toFixed(1));

    if (ObjectId.isValid(id)) {
      await studiosCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { rating: roundedRating },
          $inc: { shootsCompleted: 1 },
        }
      );
    }

    res.send({
      success: true,
      message: "Review submitted successfully! Thank you for your feedback.",
      data: { ...reviewDoc, _id: insertResult.insertedId },
      newRating: roundedRating,
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
