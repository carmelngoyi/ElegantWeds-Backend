require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const base64 = require("base-64");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(bodyParser.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://elegant-weds-frontend.vercel.app",
    "https://elegant-weds-frontend-l8g79ia54-carmel-ngoyis-projects.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

let db; 

// Basic Auth 
async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ message: "Authorization header missing or invalid" });
  }

  const [email, password] = base64.decode(authHeader.split(" ")[1]).split(":");
  const user = await db.collection("Users").findOne({ email });
  if (!user) return res.status(401).json({ message: "User not found" });

  const decodedPassword = base64.decode(user.password);
  if (decodedPassword !== password) return res.status(401).json({ message: "Invalid password" });

  req.user = user;
  next();
}

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!email.includes("@")) throw new Error("Invalid email");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    if (password !== confirmPassword) throw new Error("Passwords do not match");

    const existingUser = await db.collection("Users").findOne({ email });
    if (existingUser) return res.status(409).json({ error: "Email already registered" });

    const encodedPassword = base64.encode(password);
    const result = await db.collection("Users").insertOne({
      name,
      email,
      password: encodedPassword,
      createdAt: new Date()
    });

    res.status(201).json({ message: "User created", user_id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return res.status(401).json({ error: "Authorization header missing or invalid" });
    }

    const [email, password] = base64.decode(authHeader.split(" ")[1]).split(":");
    const user = await db.collection("Users").findOne({ email });

    if (!user || base64.decode(user.password) !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: { email: user.email, _id: user._id }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dresses CRUD
app.get("/dresses", async (req, res) => {
  try {
    const dresses = await db.collection("dresses").find().toArray();
    res.json(dresses);
  } catch {
    res.status(500).json({ error: "Failed to fetch dresses" });
  }
});

app.post("/dresses", async (req, res) => {
  try {
    const result = await db.collection("dresses").insertOne(req.body);
    res.status(201).json({ message: "Dress created", id: result.insertedId });
  } catch {
    res.status(500).json({ error: "Failed to add dress" });
  }
});

app.put("/dresses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("dresses").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    res.json({ message: "Dress updated" });
  } catch {
    res.status(500).json({ error: "Failed to update dress" });
  }
});

app.delete("/dresses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("dresses").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Dress deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete dress" });
  }
});

// Accessories
app.get("/accessories", async (req, res) => {
  try {
    const accessories = await db.collection("accessories").find().toArray();
    res.json(accessories);
  } catch {
    res.status(500).json({ error: "Failed to fetch accessories" });
  }
});

app.post("/accessories", async (req, res) => {
  try {
    const result = await db.collection("accessories").insertOne(req.body);
    res.status(201).json({ message: "Accessory created", id: result.insertedId });
  } catch {
    res.status(500).json({ error: "Failed to add accessory" });
  }
});

app.put("/accessories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("accessories").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    res.json({ message: "Accessory updated" });
  } catch {
    res.status(500).json({ error: "Failed to update accessory" });
  }
});

app.delete("/accessories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("accessories").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Accessory deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete accessory" });
  }
});

// Reviews
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await db.collection("reviews").find().toArray();
    res.json(reviews);
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.post("/reviews", basicAuth, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      userId: req.user._id,
      userName: req.user.name,
      createdAt: new Date()
    };
    const result = await db.collection("reviews").insertOne(reviewData);
    res.status(201).json({ message: "Review added", id: result.insertedId, review: reviewData });
  } catch {
    res.status(500).json({ error: "Failed to add review" });
  }
});

// Bookings
app.get("/bookings", async (req, res) => {
  try {
    const bookings = await db.collection("bookings").find().toArray();
    res.json(bookings);
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.post("/bookings", async (req, res) => {
  try {
    const result = await db.collection("bookings").insertOne(req.body);
    res.status(201).json({ message: "Booking saved", id: result.insertedId });
  } catch {
    res.status(500).json({ error: "Failed to save booking" });
  }
});

// Protected Users Routes 
app.use("/Users", basicAuth);

app.get("/Users", async (req, res) => {
  const users = await db.collection("Users").find().toArray();
  res.json(users);
});

app.put("/Users/:id", async (req, res) => {
  const { id } = req.params;
  await db.collection("Users").updateOne({ _id: new ObjectId(id) }, { $set: req.body });
  res.json({ message: "User updated" });
});

app.delete("/Users/:id", async (req, res) => {
  const { id } = req.params;
  await db.collection("Users").deleteOne({ _id: new ObjectId(id) });
  res.json({ message: "User deleted" });
});

async function startServer() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db("Elegant_Weds");
    console.log(" Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

startServer();
