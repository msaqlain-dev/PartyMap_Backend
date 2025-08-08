import { deleteFile, getFileUrl } from "../config/multer.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendResponse } from "../middleware/responseHandler.js";
import Marker from "../models/marker.model.js";
import {
  deleteMarkerFiles,
  populateMarkerImages,
} from "../services/marker.service.js";
import { formatTickets } from "../utils/index.js";

// Create a new marker with image upload
const createMarker = asyncHandler(async (req, res) => {
  let markerData = { ...req.body };

  if (markerData.tickets) {
    if (typeof markerData.tickets === "string") {
      try {
        markerData.tickets = JSON.parse(tickets);
      } catch (err) {
        markerData.tickets = [];
      }
    }
    markerData.tickets = formatTickets(markerData.tickets);
  }

  if (req.files?.partyIcon) markerData.partyIcon = req.files.partyIcon[0].key;
  if (req.files?.placeImage)
    markerData.placeImage = req.files.placeImage[0].key;
  if (req.files?.partyImage)
    markerData.partyImage = req.files.partyImage[0].key;

  const marker = await Marker.create(markerData);
  sendResponse(res, { status: 201, message: "Marker created", data: marker });
});

// Get all markers
const getAllMarkersWithoutPagination = asyncHandler(async (req, res) => {
  const markers = await Marker.find();

  // Use map instead of forEach
  const updatedMarkers = await Promise.all(
    markers.map(async (marker) => {
      marker.tickets = marker.tickets.map((ticket) => {
        return {
          hour: ticket.hour.replace(/:00/g, ""),
          availableTickets: ticket.availableTickets,
        };
      });
      marker.partyIcon = marker.partyIcon
        ? await getFileUrl(marker.partyIcon)
        : null;
      marker.placeImage = marker.placeImage
        ? await getFileUrl(marker.placeImage)
        : null;
      marker.partyImage = marker.partyImage
        ? await getFileUrl(marker.partyImage)
        : null;
      return marker; // Ensure you return the modified marker
    })
  );

  res.status(200).send(updatedMarkers);
});

const getAllMarkers = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search = "" } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const searchQuery = search
    ? {
        $or: [
          { markerType: { $regex: search, $options: "i" } },
          { placeName: { $regex: search, $options: "i" } },
          { partyTime: { $regex: search, $options: "i" } },
          { markerLabel: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const totalRecords = await Marker.countDocuments(searchQuery);
  let markers = await Marker.find(searchQuery).skip(skip).limit(limit);

  markers = await Promise.all(markers.map(populateMarkerImages));

  sendResponse(res, {
    message: "Markers fetched",
    data: markers,
    meta: { currentPage: page, totalRecords },
  });
});

// Get a single marker by ID
const getMarkerById = asyncHandler(async (req, res) => {
  let marker = await Marker.findById(req.params.id);
  if (!marker)
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Marker not found",
    });

  marker = await populateMarkerImages(marker);
  sendResponse(res, { message: "Marker fetched", data: marker });
});

// Update a marker by ID
const updateMarker = asyncHandler(async (req, res) => {
  const marker = await Marker.findById(req.params.id);
  if (!marker)
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Marker not found",
    });

  let updatedData = { ...req.body };
  if (updatedData.tickets) {
    if (typeof markerData.tickets === "string") {
      try {
        markerData.tickets = JSON.parse(tickets);
      } catch (err) {
        markerData.tickets = [];
      }
    }
    updatedData.tickets = formatTickets(updatedData.tickets);
  }

  if (req.files?.partyIcon) {
    await deleteFile(marker.partyIcon);
    updatedData.partyIcon = req.files.partyIcon[0].key;
  }
  if (req.files?.placeImage) {
    await deleteFile(marker.placeImage);
    updatedData.placeImage = req.files.placeImage[0].key;
  }
  if (req.files?.partyImage) {
    await deleteFile(marker.partyImage);
    updatedData.partyImage = req.files.partyImage[0].key;
  }

  Object.assign(marker, updatedData);
  await marker.save();

  sendResponse(res, { message: "Marker updated", data: marker });
});

// Delete a marker by ID
const deleteMarker = asyncHandler(async (req, res) => {
  const marker = await Marker.findByIdAndDelete(req.params.id);
  if (!marker)
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "Marker not found",
    });

  await deleteMarkerFiles(marker);
  sendResponse(res, { message: "Marker deleted", data: marker });
});

// Delete all markers
const deleteAllMarkers = asyncHandler(async (req, res) => {
  const markers = await Marker.find();
  for (const marker of markers) await deleteMarkerFiles(marker);

  await Marker.deleteMany();
  sendResponse(res, { message: "All markers deleted" });
});

const deleteMultipleMarkers = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return sendResponse(res, {
      status: 400,
      success: false,
      message: "Please provide an array of marker IDs to delete",
    });
  }

  const markers = await Marker.find({ _id: { $in: ids } });

  if (markers.length === 0) {
    return sendResponse(res, {
      status: 404,
      success: false,
      message: "No markers found for the provided IDs",
    });
  }

  // Delete associated files
  for (const marker of markers) {
    await deleteMarkerFiles(marker);
  }

  // Delete markers from DB
  await Marker.deleteMany({ _id: { $in: ids } });

  sendResponse(res, {
    message: `${markers.length} markers deleted successfully`,
    data: { deletedIds: ids },
  });
});

export {
  createMarker,
  getAllMarkers,
  getAllMarkersWithoutPagination,
  getMarkerById,
  updateMarker,
  deleteMarker,
  deleteAllMarkers,
  deleteMultipleMarkers,
};
