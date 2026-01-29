// api/index.js
import app from "../app.js";
import { connectDB } from "../db/connectDB.js";

export default async function handler(req, res) {
  await connectDB();     // ensures DB connection (cached)
  return app(req, res);  // forward request to Express
}
