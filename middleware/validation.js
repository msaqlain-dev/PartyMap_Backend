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

export const validatePolygon = (req, res, next) => {
  const { name, polygonType, geometry } = req.body;

  const errors = [];

  // Required fields validation
  if (!name || name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!polygonType) {
    errors.push("Polygon type is required");
  }

  if (!geometry) {
    errors.push("Geometry is required");
  }

  // Polygon type validation
  const validTypes = [
    "building",
    "area",
    "zone",
    "boundary",
    "venue",
    "park",
    "parking",
    "other",
  ];
  if (polygonType && !validTypes.includes(polygonType)) {
    errors.push(
      `Invalid polygon type. Must be one of: ${validTypes.join(", ")}`
    );
  }

  // Basic geometry validation (detailed validation happens in controller)
  if (geometry) {
    // Check if it's old format or new format
    if (geometry.outerRing) {
      // Old format - check outerRing
      if (
        !geometry.outerRing.coordinates ||
        !Array.isArray(geometry.outerRing.coordinates)
      ) {
        errors.push("Geometry outerRing must have coordinates array");
      }
    } else if (geometry.coordinates) {
      // New format - check coordinates
      if (!Array.isArray(geometry.coordinates)) {
        errors.push("Geometry coordinates must be an array");
      }
    } else {
      errors.push("Geometry must have either outerRing or coordinates");
    }
  }

  // Style validation
  if (req.body.style) {
    const { fillColor, strokeColor } = req.body.style;
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (fillColor && !colorRegex.test(fillColor)) {
      errors.push("Fill color must be a valid hex color");
    }

    if (strokeColor && !colorRegex.test(strokeColor)) {
      errors.push("Stroke color must be a valid hex color");
    }
  }

  // Extrusion validation
  if (req.body.extrusion) {
    const { height, color } = req.body.extrusion;

    if (height !== undefined && (height < 0 || height > 1000)) {
      errors.push("Extrusion height must be between 0 and 1000");
    }

    if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      errors.push("Extrusion color must be a valid hex color");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors,
    });
  }

  next();
};
