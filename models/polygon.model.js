import { Schema, model } from "mongoose";

const coordinateSchema = new Schema(
  {
    longitude: {
      type: Number,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const ringSchema = new Schema(
  {
    coordinates: {
      type: [coordinateSchema],
      required: true,
      validate: {
        validator: function (coords) {
          // Must have at least 4 coordinates (3 unique points + closing point)
          if (coords.length < 4) return false;
          // First and last coordinates must be the same (closed polygon)
          const first = coords[0];
          const last = coords[coords.length - 1];
          return (
            first.longitude === last.longitude &&
            first.latitude === last.latitude
          );
        },
        message:
          "Polygon must have at least 4 coordinates and be closed (first and last coordinates must be the same)",
      },
    },
  },
  { _id: false }
);

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
    // GeoJSON-style coordinates: [outerRing, hole1, hole2, ...]
    geometry: {
      outerRing: {
        type: ringSchema,
        required: true,
      },
      holes: {
        type: [ringSchema],
        default: [],
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

// Index for geospatial queries
polygonSchema.index({ "geometry.outerRing.coordinates": "2dsphere" });

// Virtual for getting total coordinate count
polygonSchema.virtual("coordinateCount").get(function () {
  let count = this.geometry.outerRing.coordinates.length;
  this.geometry.holes.forEach((hole) => {
    count += hole.coordinates.length;
  });
  return count;
});

// Method to convert to GeoJSON format
polygonSchema.methods.toGeoJSON = function () {
  const coordinates = [
    this.geometry.outerRing.coordinates.map((coord) => [
      coord.longitude,
      coord.latitude,
    ]),
  ];

  // Add holes if they exist
  this.geometry.holes.forEach((hole) => {
    coordinates.push(
      hole.coordinates.map((coord) => [coord.longitude, coord.latitude])
    );
  });

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: coordinates,
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
