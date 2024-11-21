import { Router } from "express";
import Marker from "../models/Marker.js";

const router = Router();

// Create a new marker
router.post("/", async (req, res) => {
  try {
    const marker = new Marker(req.body);
    await marker.save();
    res.status(201).send(marker);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all markers
router.get("/", async (req, res) => {
  try {
    const markers = await Marker.find();
    res.status(200).send(markers);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get a single marker by ID
router.get("/:id", async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.id);

    if (!marker) {
      return res.status(404).send();
    }

    // Convert binary data to Base64 for images
    if (marker.partyIcon && marker.partyIcon.data) {
      marker.partyIcon = `data:${
        marker.partyIcon.contentType
      };base64,${marker.partyIcon.data.toString("base64")}`;
    }
    if (marker.placeImage && marker.placeImage.data) {
      marker.placeImage = `data:${
        marker.placeImage.contentType
      };base64,${marker.placeImage.data.toString("base64")}`;
    }
    if (marker.partyImage && marker.partyImage.data) {
      marker.partyImage = `data:${
        marker.partyImage.contentType
      };base64,${marker.partyImage.data.toString("base64")}`;
    }

    res.status(200).send(marker);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a marker by ID
router.put("/:id", async (req, res) => {
  try {
    const marker = await Marker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!marker) {
      return res.status(404).send();
    }
    res.status(200).send(marker);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a marker by ID
router.delete("/:id", async (req, res) => {
  try {
    const marker = await Marker.findByIdAndDelete(req.params.id);
    if (!marker) {
      return res.status(404).send();
    }
    res.status(200).send(marker);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete all markers
router.delete("/", async (req, res) => {
  try {
    await Marker.deleteMany();
    res.status(200).send();
  } catch (error) {
    res.status(500).send;
  }
});

export default router;
