import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri =  process.env.MONGO_URI || ''

console.log("🔍 Mongo URI:", uri);


mongoose.connect(uri)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log("📂 Database name:", mongoose.connection.name);
  })
  .catch(err => console.error("❌ Connection error:", err));
