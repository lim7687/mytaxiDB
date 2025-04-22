const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs'); // for hashing passwords
const jwt = require('jsonwebtoken'); // for JWT-based authentication

// ⚙️ App config
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

// 🌐 MongoDB connection
let db;
const connectToMongoDB = async () => {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    db = client.db('ehailingDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
  }
};
connectToMongoDB();

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

// ========================
// 📱 CUSTOMER ROUTES
// ========================

// Register
// Register
app.post('/users', async (req, res) => {
  const { email, password, name, role } = req.body; // include 'role' here
  try {
    // Check if the email already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Include 'role' when saving user
    const result = await db.collection('users').insertOne({ email, password: hashedPassword, name, role });

    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed' });
  }
});


// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  // Generate JWT token
  const token = jwt.sign({ id: user._id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });
  res.status(200).json({ message: 'Login successful', token });
});



const plainPassword = 'adminpass123'; // change this to your desired admin password

bcrypt.hash(plainPassword, 10).then(hash => {
  console.log('👉 Hashed password:', hash);
});

// View Profile
app.get('/users/:id', async (req, res) => {
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.status(200).json(user);
});

// Book Ride
app.post('/rides', async (req, res) => {
  const { userId, pickupLocation, destination } = req.body;
  try {
    const result = await db.collection('rides').insertOne({ userId, pickupLocation, destination, status: 'Pending' });
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ride data' });
  }
});
app.post('/issues', async (req, res) => {
  try {
    const { description, driverId, userId, rideId } = req.body;
    if (!description) return res.status(400).json({ error: 'Description is required' });

    const issue = {
      description,
      resolved: false,
      ...(driverId && { driverId }),
      ...(userId && { userId }),
      ...(rideId && { rideId }),
      createdAt: new Date()
    };

    const result = await db.collection('issues').insertOne(issue);
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// Cancel Ride
app.patch('/rides/:id/cancel', async (req, res) => {
  try {
    const result = await db.collection('rides').updateOne(
      { _id: new ObjectId(req.params.id), status: { $ne: 'completed' } },
      { $set: { status: 'canceled' } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: 'Ride not found or already completed' });
    res.status(200).json({ message: 'Ride canceled' });
  } catch (err) {
    res.status(400).json({ error: 'Error canceling ride' });
  }
});

// ========================
// 🚗 DRIVER ROUTES
// ========================

// Update Availability
app.patch('/drivers/:id/availability', async (req, res) => {
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id), role: 'driver' },
      { $set: { availability: req.body.availability } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: 'Driver not found' });
    res.status(200).json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid update' });
  }
});

// Accept Ride
app.patch('/rides/:id/accept', async (req, res) => {
  try {
    const result = await db.collection('rides').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'Accepted', driverId: req.body.driverId } }
    );
    res.status(200).json({ message: 'Ride accepted' });
  } catch (err) {
    res.status(400).json({ error: 'Ride update failed' });
  }
});

// Complete Ride
app.patch('/rides/:id/complete', async (req, res) => {
  try {
    const result = await db.collection('rides').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'Completed' } }
    );
    res.status(200).json({ message: 'Ride completed' });
  } catch (err) {
    res.status(400).json({ error: 'Completion failed' });
  }
});

// View Earnings
app.get('/drivers/:id/earnings', async (req, res) => {
  try {
    const earnings = await db.collection('rides').find({ driverId: req.params.id, status: 'Completed' }).toArray();
    res.status(200).json({ earnings: earnings.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// ========================
// 🛡️ ADMIN ROUTES
// ========================

// View System Analytics (simplified)
app.get('/admin/analytics', async (req, res) => {
  try {
    const userCount = await db.collection('users').countDocuments();
    const rideCount = await db.collection('rides').countDocuments();
    res.status(200).json({ users: userCount, rides: rideCount });
  } catch (err) {
    res.status(500).json({ error: 'Analytics error' });
  }
});

// Manage User (edit)
app.patch('/admin/users/:id', async (req, res) => {
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: 'User not found or no changes made' });
    res.status(200).json({ message: 'User updated' });
  } catch (err) {
    res.status(400).json({ error: 'Update failed' });
  }
});

// Block User
// ❌ Delete User
app.delete('/admin/users/:id', async (req, res) => {
  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Error deleting user' });
  }
});
/*
app.patch('/admin/users/:id/block', async (req, res) => {
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { blocked: true } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User blocked' });
  } catch (err) {
    res.status(400).json({ error: 'Error blocking user' });
  }
});
*/

// Resolve Issue (simulate handling reports)
app.patch('/admin/issues/:id', async (req, res) => {
  try {
    const result = await db.collection('issues').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { resolved: true } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: 'Issue not found' });
    res.status(200).json({ message: 'Issue resolved' });
  } catch (err) {
    res.status(400).json({ error: 'Error resolving issue' });
  }
});

          
            