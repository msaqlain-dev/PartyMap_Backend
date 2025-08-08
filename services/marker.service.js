import { deleteFile, getFileUrl } from "../config/multer.js";

export const populateMarkerImages = async (marker) => {
  marker.partyIcon = marker.partyIcon
    ? await getFileUrl(marker.partyIcon)
    : null;
  marker.placeImage = marker.placeImage
    ? await getFileUrl(marker.placeImage)
    : null;
  marker.partyImage = marker.partyImage
    ? await getFileUrl(marker.partyImage)
    : null;
  return marker;
};

export const deleteMarkerFiles = async (marker) => {
  if (marker.partyIcon) await deleteFile(marker.partyIcon);
  if (marker.placeImage) await deleteFile(marker.placeImage);
  if (marker.partyImage) await deleteFile(marker.partyImage);
};
