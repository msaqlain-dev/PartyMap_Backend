import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../middleware/responseHandler.js";
import Polygon from "../models/polygon.model.js";
import Marker from "../models/marker.model.js";
import {
  validatePolygonGeometry,
  calculatePolygonArea,
  simplifyPolygon,
} from "../services/polygon.service.js";

// Create a new polygon
const createPolygon = asyncHandler(async (req, res) => {
  const polygonData = { ...req.body };

  // Validate geometry
  const geometryValidation = validatePolygonGeometry(polygonData.geometry);
  if (!geometryValidation.isValid) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: geometryValidation.error,
    });
  }

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

  // Validate geometry if it's being updated
  if (updatedData.geometry) {
    const geometryValidation = validatePolygonGeometry(updatedData.geometry);
    if (!geometryValidation.isValid) {
      return sendResponse(res, {
        status: 400,
        success: false,
        message: geometryValidation.error,
      });
    }
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

  // Validate all polygons
  for (const polygonData of polygons) {
    const geometryValidation = validatePolygonGeometry(polygonData.geometry);
    if (!geometryValidation.isValid) {
      return sendResponse(res, {
        status: 400,
        success: false,
        message: `Invalid polygon geometry: ${geometryValidation.error}`,
      });
    }
  }

  const createdPolygons = await Polygon.insertMany(polygons);

  sendResponse(res, {
    status: 201,
    message: `${createdPolygons.length} polygons created successfully`,
    data: createdPolygons,
  });
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
    "geometry.outerRing.coordinates": {
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
    "geometry.outerRing.coordinates": {
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
