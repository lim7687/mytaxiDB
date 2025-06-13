const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB via Mongoose
mongoose.connect("mongodb://localhost:27017/w7ride_appERD", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', (error) => console.error("MongoDB connection error:", error));
db.once('open', () => console.log("MongoDB connected"));

// Define Mongoose schemas only if needed for models
// Otherwise, you can use native collection access like below

app.get("/analytics/passengers", async (req, res) => {
  try {
    // Use native MongoDB driver aggregation through Mongoose connection
    const result = await mongoose.connection.db.collection("customers").aggregate([
      {
        $lookup: {
          from: "rides",
          localField: "_id",
          foreignField: "customerId",
          as: "rides"
        }
      },
      { $unwind: "$rides" },
      {
        $lookup: {
          from: "earnings",
          localField: "rides._id",
          foreignField: "rideId",
          as: "rideEarnings"
        }
      },
      { $unwind: "$rideEarnings" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          totalRides: { $sum: 1 },
          totalFare: { $sum: "$rideEarnings.amount" },
          avgDistance: { $avg: "$rides.distance" }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          totalRides: 1,
          totalFare: 1,
          avgDistance: 1
        }
      }
    ]).toArray();

    res.json(result);
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).send("Error running aggregation");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
