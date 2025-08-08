// middlewares/validation.js
import { body } from "express-validator";

export const validateMarker = [
  body("markerType").notEmpty().withMessage("Marker type is required"),
  body("placeName").notEmpty().withMessage("Place name is required"),
  body("latitude").notEmpty().withMessage("Latitude is required"),
  body("longitude").notEmpty().withMessage("Longitude is required"),
  body("partyTime")
    .isIn(["day", "noon", "evening", "night"])
    .withMessage("Invalid party time"),
  body("markerLabel").notEmpty().withMessage("Marker label is required"),
];
