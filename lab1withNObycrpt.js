const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); // Still used for token auth
const app = express();
const port = 3000;
app.use(express.json());

// Hello route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// 🌐 MongoDB connection
let db;
const connectToMongoDB = async () => {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    db = client.db('lab01');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
  }
};
connectToMongoDB();

// 🚀 Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

// 📝 Register (no hashing)
app.post('/users', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Store plain-text password (for learning only)
    const result = await db.collection('users').insertOne({ email, password, name });

    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

// 🔑 Login (no hashing)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign({ id: user._id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });
  res.status(200).json({ message: 'Login successful', token });
});
