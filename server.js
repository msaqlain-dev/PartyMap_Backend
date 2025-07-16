import express, { static as expressStatic } from "express";
import { connect } from "mongoose";
import bodyParser from "body-parser";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import markerRoutes from "./routes/marker.routes.js";
import userAuthRoutes from "./routes/user/auth.routes.js"
import adminAuthRoutes from "./routes/admin/auth.routes.js"
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// Create __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// app.use(bodyParser.json());
// Increase the limit for JSON and URL-encoded requests
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(expressStatic(join(__dirname, "public")));
app.use("/styles", expressStatic(join(__dirname, "styles")));
app.use("/scripts", expressStatic(join(__dirname, "scripts")));

// MongoDB connection
connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Root route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Routes
app.use("/api/markers", markerRoutes);
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
