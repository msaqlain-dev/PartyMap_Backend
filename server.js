import express, { static as expressStatic } from "express";
import { connect } from "mongoose";
import bodyParser from "body-parser";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import markerRoutes from "./routes/markerRoutes.js";
import cors from "cors";

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
connect(
  "mongodb+srv://partymap:partymap@partymapcluster.k9nnq.mongodb.net/?retryWrites=true&w=majority&appName=PartyMapCluster"
)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Root route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Routes
app.use("/api/markers", markerRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
