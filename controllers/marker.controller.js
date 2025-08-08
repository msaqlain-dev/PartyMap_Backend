import { deleteFile, getFileUrl } from "../config/multer.js";
import Marker from "../models/marker.model.js";
import { asyncHandler } from "../utils/index.js";

// Create a new marker with image upload
const createMarker = asyncHandler(async (req, res) => {
  const markerData = req.body;

  // Transform tickets array
  if (markerData.tickets) {
    markerData.tickets = markerData.tickets
      .map((availableTickets, index) => {
        if (availableTickets) {
          const hour = index;
          const period = hour < 12 ? "AM" : "PM";
          const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
          return {
            hour: `${formattedHour}:00 ${period}`,
            availableTickets: parseInt(availableTickets, 10),
          };
        }
        return null; // Skip empty values
      })
      .filter((ticket) => ticket !== null); // Remove null entries
  }

  // Assign image URLs from uploaded files
  if (req.files?.partyIcon) markerData.partyIcon = req.files.partyIcon[0].key;
  if (req.files?.placeImage)
    markerData.placeImage = req.files.placeImage[0].key;
  if (req.files?.partyImage)
    markerData.partyImage = req.files.partyImage[0].key;

  console.log("Marker data: ", markerData);

  const marker = new Marker(markerData);
  await marker.save();
  res.status(201).send(marker);
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

  const searchQuery = search.trim()
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
  const markers = await Marker.find(searchQuery).skip(skip).limit(limit);

  const updatedMarkers = await Promise.all(
    markers.map(async (marker) => {
      marker.tickets = marker.tickets.map((ticket) => ({
        hour: ticket.hour.replace(/:00/g, ""),
        availableTickets: ticket.availableTickets,
      }));

      marker.partyIcon = marker.partyIcon ? await getFileUrl(marker.partyIcon) : null;
      marker.placeImage = marker.placeImage ? await getFileUrl(marker.placeImage) : null;
      marker.partyImage = marker.partyImage ? await getFileUrl(marker.partyImage) : null;

      return marker;
    })
  );

  res.status(200).json({
    data: updatedMarkers,
    metaData: {
      currentPage: page,
      totalRecords,
    },
  });
});

// Get a single marker by ID
const getMarkerById = asyncHandler(async (req, res) => {
  const marker = await Marker.findById(req.params.id);

  if (!marker) {
    return res.status(404).send();
  }

  marker.partyIcon = marker.partyIcon
    ? await getFileUrl(marker.partyIcon)
    : null;
  marker.placeImage = marker.placeImage
    ? await getFileUrl(marker.placeImage)
    : null;
  marker.partyImage = marker.partyImage
    ? await getFileUrl(marker.partyImage)
    : null;

  res.status(200).send(marker);
});

// Update a marker by ID
const updateMarker = asyncHandler(async (req, res) => {
  const markerData = req.body;
  const marker = await Marker.findById(req.params.id);
  if (!marker) {
    return res.status(404).send();
  }

  // Transform tickets array
  if (markerData.tickets) {
    markerData.tickets = markerData.tickets
      .map((availableTickets, index) => {
        if (
          availableTickets !== null &&
          availableTickets !== undefined &&
          availableTickets !== ""
        ) {
          const hour = index; // 0 to 23
          const period = hour < 12 ? "AM" : "PM";
          const formattedHour = hour % 12 === 0 ? 12 : hour % 12; // Convert 0 to 12 for 12 AM/PM
          return {
            hour: `${formattedHour}:00 ${period}`,
            availableTickets: parseInt(availableTickets, 10),
          };
        }
        return null; // Skip empty values
      })
      .filter((ticket) => ticket !== null); // Remove null entries
  }

  // If images are uploaded, delete old ones and update with new URLs
  if (req.files?.partyIcon) {
    await deleteFile(marker.partyIcon);
    marker.partyIcon = req.files.partyIcon[0].key;
  }
  if (req.files?.placeImage) {
    await deleteFile(marker.placeImage);
    marker.placeImage = req.files.placeImage[0].key;
  }
  if (req.files?.partyImage) {
    await deleteFile(marker.partyImage);
    marker.partyImage = req.files.partyImage[0].key;
  }

  Object.assign(marker, req.body);
  await marker.save();
  res.status(200).send(marker);
});

// Delete a marker by ID
const deleteMarker = asyncHandler(async (req, res) => {
  const marker = await Marker.findByIdAndDelete(req.params.id);
  if (!marker) {
    return res.status(404).send();
  }

  // Delete associated images from S3
  if (marker.partyIcon) await deleteFile(marker.partyIcon);
  if (marker.placeImage) await deleteFile(marker.placeImage);
  if (marker.partyImage) await deleteFile(marker.partyImage);

  res.status(200).send(marker);
});

// Delete all markers
const deleteAllMarkers = asyncHandler(async (req, res) => {
  const markers = await Marker.find();

  // Delete all associated images
  for (const marker of markers) {
    if (marker.partyIcon) await deleteFile(marker.partyIcon);
    if (marker.placeImage) await deleteFile(marker.placeImage);
    if (marker.partyImage) await deleteFile(marker.partyImage);
  }

  await Marker.deleteMany();
  res.status(200).send();
});

export {
  createMarker,
  getAllMarkers,
  getAllMarkersWithoutPagination,
  getMarkerById,
  updateMarker,
  deleteMarker,
  deleteAllMarkers,
};
