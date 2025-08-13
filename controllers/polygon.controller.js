import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../middleware/responseHandler.js";
import Polygon from "../models/polygon.model.js";
import Marker from "../models/marker.model.js";

// Helper function to convert old format to GeoJSON coordinates
const convertToGeoJSONCoordinates = (inputGeometry) => {
  try {
    // If it's already in the correct format [[[lng, lat], [lng, lat]...]]
    if (Array.isArray(inputGeometry.coordinates)) {
      return inputGeometry.coordinates;
    }

    // If it's in the old format with outerRing and holes
    if (inputGeometry.outerRing && inputGeometry.outerRing.coordinates) {
      const coordinates = [];

      // Convert outer ring from {longitude, latitude} to [longitude, latitude]
      const outerRing = inputGeometry.outerRing.coordinates.map((coord) => {
        if (
          typeof coord === "object" &&
          coord.longitude !== undefined &&
          coord.latitude !== undefined
        ) {
          return [coord.longitude, coord.latitude];
        }
        return coord; // Already in correct format
      });
      coordinates.push(outerRing);

      // Convert holes if they exist
      if (inputGeometry.holes && Array.isArray(inputGeometry.holes)) {
        inputGeometry.holes.forEach((hole) => {
          if (hole.coordinates) {
            const holeRing = hole.coordinates.map((coord) => {
              if (
                typeof coord === "object" &&
                coord.longitude !== undefined &&
                coord.latitude !== undefined
              ) {
                return [coord.longitude, coord.latitude];
              }
              return coord;
            });
            coordinates.push(holeRing);
          }
        });
      }

      return coordinates;
    }

    throw new Error("Invalid geometry format");
  } catch (error) {
    throw new Error(`Failed to convert geometry: ${error.message}`);
  }
};

// Validate polygon geometry
const validatePolygonGeometry = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { isValid: false, error: "Coordinates must be a non-empty array" };
  }

  // Check outer ring
  const outerRing = coordinates[0];
  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return {
      isValid: false,
      error: "Outer ring must have at least 4 coordinates",
    };
  }

  // Check if polygon is closed
  const first = outerRing[0];
  const last = outerRing[outerRing.length - 1];

  if (
    !Array.isArray(first) ||
    !Array.isArray(last) ||
    first.length !== 2 ||
    last.length !== 2 ||
    first[0] !== last[0] ||
    first[1] !== last[1]
  ) {
    return {
      isValid: false,
      error:
        "Polygon must be closed (first and last coordinates must be the same)",
    };
  }

  // Validate coordinate values
  for (let i = 0; i < outerRing.length; i++) {
    const coord = outerRing[i];
    if (
      !Array.isArray(coord) ||
      coord.length !== 2 ||
      typeof coord[0] !== "number" ||
      typeof coord[1] !== "number"
    ) {
      return {
        isValid: false,
        error: `Invalid coordinate at position ${i}: must be [longitude, latitude]`,
      };
    }

    // Check coordinate bounds
    if (coord[0] < -180 || coord[0] > 180) {
      return {
        isValid: false,
        error: `Longitude at position ${i} must be between -180 and 180`,
      };
    }

    if (coord[1] < -90 || coord[1] > 90) {
      return {
        isValid: false,
        error: `Latitude at position ${i} must be between -90 and 90`,
      };
    }
  }

  return { isValid: true };
};

// Create a new polygon
const createPolygon = asyncHandler(async (req, res) => {
  const polygonData = { ...req.body };

  try {
    // Convert geometry to correct format
    const coordinates = convertToGeoJSONCoordinates(polygonData.geometry);

    // Validate geometry
    const geometryValidation = validatePolygonGeometry(coordinates);
    if (!geometryValidation.isValid) {
      return sendResponse(res, {
        status: 400,
        success: false,
        message: geometryValidation.error,
      });
    }

    // Update polygon data with correct geometry format
    polygonData.geometry = {
      type: "Polygon",
      coordinates: coordinates,
    };

    // Check if marker exists (if provided)
    if (polygonData.marker) {
      const marker = await Marker.findById(polygonData.marker);
      if (!marker) {
        return sendResponse(res, {
          status: 404,
          success: false,
          message: "Associated marker not found",
        });
      }
    }

    const polygon = await Polygon.create(polygonData);
    await polygon.populate("marker");

    sendResponse(res, {
      status: 201,
      message: "Polygon created successfully",
      data: polygon,
    });
  } catch (error) {
    console.error("Polygon creation error:", error);
    sendResponse(res, {
      status: 400,
      success: false,
      message: error.message || "Failed to create polygon",
    });
  }
});

// Get all polygons with pagination
const getAllPolygons = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search = "", type = "" } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  let searchQuery = {};

  if (search) {
    searchQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { polygonType: { $regex: search, $options: "i" } },
    ];
  }

  if (type) {
    searchQuery.polygonType = type;
  }

  const totalRecords = await Polygon.countDocuments(searchQuery);
  const polygons = await Polygon.find(searchQuery)
    .populate("marker", "placeName markerType")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  sendResponse(res, {
    message: "Polygons fetched successfully",
    data: polygons,
    meta: {
      currentPage: page,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
  });
});

// Get all polygons without pagination
const getAllPolygonsWithoutPagination = asyncHandler(async (req, res) => {
  const { type = "", visible = "" } = req.query;

  let query = {};
  if (type) query.polygonType = type;
  if (visible !== "") query.isVisible = visible === "true";

  const polygons = await Polygon.find(query)
    .populate("marker", "placeName markerType latitude longitude")
    .sort({ createdAt: -1 });

  sendResponse(res, {
    message: "All polygons fetched successfully",
    data: polygons,
    meta: { totalRecords: polygons.length },
  });
});

// Get all polygons as GeoJSON FeatureCollection
const getAllPolygonsAsGeoJSON = asyncHandler(async (req, res) => {
  const { type = "", visible = "true" } = req.query;

  let query = { isVisible: visible === "true" };
  if (type) query.polygonType = type;

  const polygons = await Polygon.find(query).populate("marker");

  const featureCollection = {
    type: "FeatureCollection",
    features: polygons.map((polygon) => polygon.toGeoJSON()),
  };

  res.status(200).json(featureCollection);
});

// Get a single polygon by ID
const getPolygonById = asyncHandler(async (req, res) => {
  const polygon = await Polygon.findById(req.params.id).populate("marker");

  if (!polygon) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Polygon not found",
    });
  }

  sendResponse(res, {
    message: "Polygon fetched successfully",
    data: polygon,
  });
});

// Update a polygon by ID
const updatePolygon = asyncHandler(async (req, res) => {
  const polygon = await Polygon.findById(req.params.id);

  if (!polygon) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Polygon not found",
    });
  }

  const updatedData = { ...req.body };

  try {
    // Convert and validate geometry if it's being updated
    if (updatedData.geometry) {
      const coordinates = convertToGeoJSONCoordinates(updatedData.geometry);

      const geometryValidation = validatePolygonGeometry(coordinates);
      if (!geometryValidation.isValid) {
        return sendResponse(res, {
          status: 400,
          success: false,
          message: geometryValidation.error,
        });
      }

      updatedData.geometry = {
        type: "Polygon",
        coordinates: coordinates,
      };
    }

    // Check if marker exists (if being updated)
    if (updatedData.marker) {
      const marker = await Marker.findById(updatedData.marker);
      if (!marker) {
        return sendResponse(res, {
          status: 404,
          success: false,
          message: "Associated marker not found",
        });
      }
    }

    Object.assign(polygon, updatedData);
    await polygon.save();
    await polygon.populate("marker");

    sendResponse(res, {
      message: "Polygon updated successfully",
      data: polygon,
    });
  } catch (error) {
    console.error("Polygon update error:", error);
    sendResponse(res, {
      status: 400,
      success: false,
      message: error.message || "Failed to update polygon",
    });
  }
});

// Delete a polygon by ID
const deletePolygon = asyncHandler(async (req, res) => {
  const polygon = await Polygon.findByIdAndDelete(req.params.id);

  if (!polygon) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Polygon not found",
    });
  }

  sendResponse(res, {
    message: "Polygon deleted successfully",
    data: polygon,
  });
});

// Delete all polygons
const deleteAllPolygons = asyncHandler(async (req, res) => {
  const result = await Polygon.deleteMany();

  sendResponse(res, {
    message: `All polygons deleted successfully (${result.deletedCount} polygons)`,
  });
});

// Create multiple polygons
const createMultiplePolygons = asyncHandler(async (req, res) => {
  const { polygons } = req.body;

  if (!Array.isArray(polygons) || polygons.length === 0) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide an array of polygons to create",
    });
  }

  try {
    // Process and validate all polygons
    const processedPolygons = [];

    for (const polygonData of polygons) {
      const coordinates = convertToGeoJSONCoordinates(polygonData.geometry);

      const geometryValidation = validatePolygonGeometry(coordinates);
      if (!geometryValidation.isValid) {
        return sendResponse(res, {
          status: 400,
          success: false,
          message: `Invalid polygon geometry: ${geometryValidation.error}`,
        });
      }

      processedPolygons.push({
        ...polygonData,
        geometry: {
          type: "Polygon",
          coordinates: coordinates,
        },
      });
    }

    const createdPolygons = await Polygon.insertMany(processedPolygons);

    sendResponse(res, {
      status: 201,
      message: `${createdPolygons.length} polygons created successfully`,
      data: createdPolygons,
    });
  } catch (error) {
    console.error("Bulk polygon creation error:", error);
    sendResponse(res, {
      status: 400,
      success: false,
      message: error.message || "Failed to create polygons",
    });
  }
});

// Delete multiple polygons
const deleteMultiplePolygons = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide an array of polygon IDs to delete",
    });
  }

  const result = await Polygon.deleteMany({ _id: { $in: ids } });

  if (result.deletedCount === 0) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "No polygons found for the provided IDs",
    });
  }

  sendResponse(res, {
    message: `${result.deletedCount} polygons deleted successfully`,
    data: { deletedIds: ids, deletedCount: result.deletedCount },
  });
});

// Bulk update polygons
const bulkUpdatePolygons = asyncHandler(async (req, res) => {
  const { ids, updateData } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide an array of polygon IDs to update",
    });
  }

  const result = await Polygon.updateMany(
    { _id: { $in: ids } },
    { $set: updateData }
  );

  sendResponse(res, {
    message: `${result.modifiedCount} polygons updated successfully`,
    data: { updatedCount: result.modifiedCount },
  });
});

// Get polygons associated with a specific marker
const getPolygonsByMarker = asyncHandler(async (req, res) => {
  const { markerId } = req.params;

  const marker = await Marker.findById(markerId);
  if (!marker) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Marker not found",
    });
  }

  const polygons = await Polygon.find({ marker: markerId }).populate(
    "marker",
    "placeName markerType"
  );

  sendResponse(res, {
    message: "Polygons fetched successfully",
    data: polygons,
    meta: { markerId, totalRecords: polygons.length },
  });
});

// Associate polygon with marker
const associateWithMarker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { markerId } = req.body;

  const polygon = await Polygon.findById(id);
  if (!polygon) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Polygon not found",
    });
  }

  const marker = await Marker.findById(markerId);
  if (!marker) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Marker not found",
    });
  }

  polygon.marker = markerId;
  await polygon.save();
  await polygon.populate("marker");

  sendResponse(res, {
    message: "Polygon associated with marker successfully",
    data: polygon,
  });
});

// Dissociate polygon from marker
const dissociateFromMarker = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const polygon = await Polygon.findById(id);
  if (!polygon) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Polygon not found",
    });
  }

  polygon.marker = undefined;
  await polygon.save();

  sendResponse(res, {
    message: "Polygon dissociated from marker successfully",
    data: polygon,
  });
});

// Get polygons within bounding box
const getPolygonsWithinBounds = asyncHandler(async (req, res) => {
  const { bounds } = req.body; // { north, south, east, west }

  if (
    !bounds ||
    !bounds.north ||
    !bounds.south ||
    !bounds.east ||
    !bounds.west
  ) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide valid bounds (north, south, east, west)",
    });
  }

  const polygons = await Polygon.find({
    geometry: {
      $geoWithin: {
        $geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bounds.west, bounds.north],
              [bounds.east, bounds.north],
              [bounds.east, bounds.south],
              [bounds.west, bounds.south],
              [bounds.west, bounds.north],
            ],
          ],
        },
      },
    },
  }).populate("marker");

  sendResponse(res, {
    message: "Polygons within bounds fetched successfully",
    data: polygons,
    meta: { bounds, totalRecords: polygons.length },
  });
});

// Get polygons intersecting with a geometry
const getPolygonsIntersecting = asyncHandler(async (req, res) => {
  const { geometry } = req.body; // GeoJSON geometry

  if (!geometry) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide a valid GeoJSON geometry",
    });
  }

  const polygons = await Polygon.find({
    geometry: {
      $geoIntersects: {
        $geometry: geometry,
      },
    },
  }).populate("marker");

  sendResponse(res, {
    message: "Intersecting polygons fetched successfully",
    data: polygons,
    meta: { totalRecords: polygons.length },
  });
});

// Export all functions
export {
  createPolygon,
  getAllPolygons,
  getAllPolygonsWithoutPagination,
  getAllPolygonsAsGeoJSON,
  getPolygonById,
  updatePolygon,
  deletePolygon,
  deleteAllPolygons,
  createMultiplePolygons,
  deleteMultiplePolygons,
  bulkUpdatePolygons,
  getPolygonsByMarker,
  associateWithMarker,
  dissociateFromMarker,
  getPolygonsWithinBounds,
  getPolygonsIntersecting,
};
