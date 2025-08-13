import { Schema, model } from "mongoose";

// FIXED: Use standard GeoJSON format that MongoDB understands
const polygonSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    polygonType: {
      type: String,
      enum: [
        "building",
        "area",
        "zone",
        "boundary",
        "venue",
        "park",
        "parking",
        "other",
      ],
      required: true,
      default: "building",
    },
    // FIXED: Use GeoJSON format that MongoDB can index
    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]], // Array of arrays of [longitude, latitude] pairs
        required: true,
        validate: {
          validator: function (coords) {
            // Must have at least one ring (outer ring)
            if (!coords || coords.length === 0) return false;

            // Check outer ring
            const outerRing = coords[0];
            if (!outerRing || outerRing.length < 4) return false;

            // First and last coordinates must be the same (closed polygon)
            const first = outerRing[0];
            const last = outerRing[outerRing.length - 1];
            return first[0] === last[0] && first[1] === last[1];
          },
          message:
            "Polygon must be closed (first and last coordinates must be the same) and have at least 4 coordinates",
        },
      },
    },
    // Visual properties
    style: {
      fillColor: {
        type: String,
        default: "#0000FF",
        validate: {
          validator: function (color) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
          },
          message:
            "Fill color must be a valid hex color (e.g., #FF0000 or #F00)",
        },
      },
      fillOpacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8,
      },
      strokeColor: {
        type: String,
        default: "#000000",
        validate: {
          validator: function (color) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
          },
          message:
            "Stroke color must be a valid hex color (e.g., #FF0000 or #F00)",
        },
      },
      strokeWidth: {
        type: Number,
        min: 0,
        max: 10,
        default: 1,
      },
      strokeOpacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 1,
      },
    },
    // 3D properties for extrusion
    extrusion: {
      height: {
        type: Number,
        min: 0,
        max: 1000,
        default: 50,
      },
      base: {
        type: Number,
        min: 0,
        default: 0,
      },
      color: {
        type: String,
        default: "#0000FF",
        validate: {
          validator: function (color) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
          },
          message:
            "Extrusion color must be a valid hex color (e.g., #FF0000 or #F00)",
        },
      },
      opacity: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8,
      },
    },
    // Optional association with marker
    marker: {
      type: Schema.Types.ObjectId,
      ref: "Marker",
      required: false,
    },
    // Additional properties
    properties: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    // Visibility and interaction
    isVisible: {
      type: Boolean,
      default: true,
    },
    isInteractive: {
      type: Boolean,
      default: true,
    },
    // Zoom level constraints
    minZoom: {
      type: Number,
      min: 0,
      max: 24,
      default: 0,
    },
    maxZoom: {
      type: Number,
      min: 0,
      max: 24,
      default: 24,
    },
  },
  {
    timestamps: true,
  }
);

// FIXED: Create geospatial index on the correct field
polygonSchema.index({ geometry: "2dsphere" });

// Virtual for getting total coordinate count
polygonSchema.virtual("coordinateCount").get(function () {
  let count = 0;
  this.geometry.coordinates.forEach((ring) => {
    count += ring.length;
  });
  return count;
});

// Method to convert to GeoJSON format for frontend
polygonSchema.methods.toGeoJSON = function () {
  return {
    type: "Feature",
    geometry: {
      type: this.geometry.type,
      coordinates: this.geometry.coordinates,
    },
    properties: {
      id: this._id,
      name: this.name,
      description: this.description,
      polygonType: this.polygonType,
      height: this.extrusion.height,
      color: this.extrusion.color,
      fillColor: this.style.fillColor,
      fillOpacity: this.style.fillOpacity,
      strokeColor: this.style.strokeColor,
      strokeWidth: this.style.strokeWidth,
      strokeOpacity: this.style.strokeOpacity,
      opacity: this.extrusion.opacity,
      base: this.extrusion.base,
      isVisible: this.isVisible,
      isInteractive: this.isInteractive,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      marker: this.marker,
      ...Object.fromEntries(this.properties),
    },
  };
};

const Polygon = model("Polygon", polygonSchema);

export default Polygon;
