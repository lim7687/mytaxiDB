// 📁 index.js
require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const saltRounds = 10;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(express.json());

// Middleware: Token Verification
function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(403).json({ error: "Token required" });
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = decoded;
      next();
    });
  } catch (err) {
    res.status(403).json({ error: "Unauthorized access" });
  }
}

function generateToken(user) {
  return jwt.sign(user, jwtSecret, { expiresIn: "1h" });
}

async function encryptPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function decryptPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Run main server
async function run() {
  try {
    await client.connect();
    const db = client.db("mytaxi");
    const users = db.collection("Users");
    const rides = db.collection("Rides");

    app.listen(port, () => {
      console.log(`\u{1F680} Server running on http://localhost:${port}`);
    });

    // ========== AUTH & ADMIN ==========

    app.post("/registerAdmin", async (req, res) => {
      try {
        const data = req.body;
        data.password = await encryptPassword(data.password);
        data.role = "Admin";
        await users.insertOne(data);
        res.json({ message: "Admin registered" });
      } catch (err) {
        res.status(500).json({ error: "Internal error" });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        const user = await users.findOne({ username });
        if (user && await decryptPassword(password, user.password)) {
          const token = generateToken({ username: user.username, role: user.role });
          res.json({ token, role: user.role });
        } else {
          res.status(401).json({ error: "Invalid credentials" });
        }
      } catch {
        res.status(500).json({ error: "Login error" });
      }
    });

    app.post("/registerUser", verifyToken, async (req, res) => {
      if (req.user.role !== "Admin") return res.status(403).json({ error: "Only Admin can register users" });
      try {
        const data = req.body;
        data.password = await encryptPassword(data.password);
        await users.insertOne(data);
        res.json({ message: `${data.role} registered` });
      } catch {
        res.status(500).json({ error: "Registration failed" });
      }
    });

    app.get("/users", verifyToken, async (req, res) => {
      if (req.user.role !== "Admin") return res.status(403).json({ error: "Access denied" });
      const allUsers = await users.find().toArray();
      res.json(allUsers);
    });

    app.delete("/deleteUser/:username", verifyToken, async (req, res) => {
      if (req.user.role !== "Admin") return res.status(403).json({ error: "Access denied" });
      await users.deleteOne({ username: req.params.username });
      res.json({ message: "User deleted" });
    });

    app.get("/admin/ridesSummary", verifyToken, async (req, res) => {
      if (req.user.role !== "Admin") return res.status(403).json({ error: "Access denied" });
      const summary = await rides.aggregate([
        { $match: { driver: { $exists: true } } },
        {
          $group: {
            _id: "$driver",
            totalRides: { $sum: 1 },
            completedRides: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
            ongoingRides: { $sum: { $cond: [{ $eq: ["$status", "Ongoing"] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from: "Users",
            localField: "_id",
            foreignField: "username",
            as: "driverInfo"
          }
        },
        { $unwind: "$driverInfo" },
        {
          $project: {
            driver: "$_id",
            totalRides: 1,
            completedRides: 1,
            ongoingRides: 1,
            "driverInfo.name": 1,
            "driverInfo.phone": 1,
            "driverInfo.rating": 1
          }
        }
      ]).toArray();
      res.json(summary);
    });

    // ========== PASSENGER ==========

    app.post("/requestRide", verifyToken, async (req, res) => {
      if (req.user.role !== "Passenger") return res.status(403).json({ error: "Only Passenger can request ride" });
      const ride = { ...req.body, passenger: req.user.username, status: "Pending" };
      await rides.insertOne(ride);
      res.json({ message: "Ride requested" });
    });

    app.get("/myAcceptedRides", verifyToken, async (req, res) => {
      if (req.user.role !== "Passenger") return res.status(403).json({ error: "Access denied" });
      const result = await rides.aggregate([
        { $match: { passenger: req.user.username, status: "Ongoing" } },
        {
          $lookup: {
            from: "Users",
            localField: "driver",
            foreignField: "username",
            as: "driverInfo"
          }
        },
        { $unwind: "$driverInfo" },
        {
          $project: {
            pickup: 1,
            destination: 1,
            time: 1,
            status: 1,
            "driverInfo.name": 1,
            "driverInfo.phone": 1,
            "driverInfo.rating": 1,
            "driverInfo.car": 1,
            "driverInfo.username": 1
          }
        }
      ]).toArray();
      res.json(result);
    });

    // ========== DRIVER ==========

    app.get("/availableRides", verifyToken, async (req, res) => {
      if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });
      const result = await rides.find({ status: "Pending" }).project({ pickup: 1, destination: 1, time: 1, status: 1, _id: 1 }).toArray();
      res.json(result);
    });

    app.post("/acceptRide/:rideId", verifyToken, async (req, res) => {
      if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });
      const ride = await rides.findOne({ _id: new ObjectId(req.params.rideId) });
      if (!ride || ride.status !== "Pending") return res.status(400).json({ error: "Ride not available" });
      await rides.updateOne({ _id: ride._id }, { $set: { driver: req.user.username, status: "Ongoing" } });
      res.json({ message: "Ride accepted" });
    });
    app.post("/completeRide/:rideId", verifyToken, async (req, res) => {
  if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });

  try {
    const rideId = req.params.rideId;

    console.log("Driver completing ride:", req.user.username);
    console.log("Ride ID from URL:", rideId);

    const ride = await rides.findOne({ _id: new ObjectId(rideId) });


    console.log("Ride found:", ride);

    if (!ride || ride.driver !== req.user.username) {
      return res.status(404).json({ error: "Ride not found or not assigned to this driver" });
    }

    if (ride.status !== "Ongoing") {
      return res.status(400).json({ error: "Ride is not ongoing" });
    }

    await rides.updateOne({ _id: ride._id }, { $set: { status: "Completed" } });

    res.json({ message: "Ride marked as completed" });
  } catch (err) {
    console.error("❌ Error in completeRide:", err);
    res.status(500).json({ error: "Failed to complete ride" });
  }
});

    app.get("/requestsWithPassengerInfo", verifyToken, async (req, res) => {
      if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });
      const result = await rides.aggregate([
        { $match: { status: "Pending" } },
        {
          $lookup: {
            from: "Users",
            localField: "passenger",
            foreignField: "username",
            as: "passengerInfo"
          }
        },
        { $unwind: "$passengerInfo" },
        {
          $project: {
            pickup: 1,
            destination: 1,
            time: 1,
            status: 1,
            "passengerInfo.name": 1,
            "passengerInfo.phone": 1,
            "passengerInfo.username": 1
          }
        }
      ]).toArray();
      res.json(result);
    });

    app.get("/myRides", verifyToken, async (req, res) => {
  if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });
  try {
    const results = await rides.aggregate([
      { $match: { driver: req.user.username } },
      {
        $lookup: {
          from: "Users",
          localField: "passenger",
          foreignField: "username",
          as: "passengerInfo"
        }
      },
      { $unwind: "$passengerInfo" },
      {
        $project: {
          pickup: 1,
          destination: 1,
          time: 1,
          status: 1,
          passenger: 1,
          "passengerInfo.name": 1,
          "passengerInfo.phone": 1,
          "passengerInfo.username": 1
        }
      }
    ]).toArray();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your rides" });
  }
});

    app.put("/updateProfile", verifyToken, async (req, res) => {
      if (req.user.role !== "Driver") return res.status(403).json({ error: "Access denied" });
      await users.updateOne({ username: req.user.username }, { $set: req.body });
      res.json({ message: "Profile updated" });
    });

    // ========== Shared (Passenger or Driver) ==========

    app.delete("/deleteAccount", verifyToken, async (req, res) => {
      if (req.user.role === "Admin") return res.status(403).json({ error: "Admin cannot delete self here" });
      await users.deleteOne({ username: req.user.username });
      res.json({ message: "Account deleted" });
    });

    // Error middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: "Something went wrong" });
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.error);
// ... all your route handlers and logic above this

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

