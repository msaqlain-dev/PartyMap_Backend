import { Router } from "express";
import * as markerController from "../controllers/marker.controller.js";
import { upload } from "../config/multer.js";
import { validateMarker } from "../middleware/validation.js";
const router = Router();

const uploadFields = upload.fields([
  { name: "partyIcon", maxCount: 1 },
  { name: "placeImage", maxCount: 1 },
  { name: "partyImage", maxCount: 1 },
]);

router.post("/", uploadFields, validateMarker, markerController.createMarker);
router.post("/delete-multiple", markerController.deleteMultipleMarkers);
router.get("/", markerController.getAllMarkers);
router.get("/all", markerController.getAllMarkersWithoutPagination);
router.get("/:id", markerController.getMarkerById);
router.put("/:id", uploadFields, validateMarker, markerController.updateMarker);
router.delete("/:id", markerController.deleteMarker);
router.delete("/", markerController.deleteAllMarkers);

export default router;
