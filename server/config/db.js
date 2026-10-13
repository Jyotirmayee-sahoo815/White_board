const mongoose = require("mongoose");

let connected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("[db] MONGODB_URI is not set. Using in-memory board state only.");
    return false;
  }

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri);
    connected = true;
    console.log("[db] MongoDB connected");
    return true;
  } catch (err) {
    connected = false;
    console.error("[db] MongoDB connection failed. Falling back to in-memory state.");
    console.error("[db]", err.message);
    return false;
  }
}

function isDbConnected() {
  return connected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };
