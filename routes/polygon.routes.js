import { Router } from "express";
import * as polygonController from "../controllers/polygon.controller.js";
import { validatePolygon } from "../middleware/validation.js";

const router = Router();

// CRUD operations
router.post("/", validatePolygon, polygonController.createPolygon);
router.get("/", polygonController.getAllPolygons);
router.get("/all", polygonController.getAllPolygonsWithoutPagination);
router.get("/geojson", polygonController.getAllPolygonsAsGeoJSON);
router.get("/:id", polygonController.getPolygonById);
router.put("/:id", validatePolygon, polygonController.updatePolygon);
router.delete("/:id", polygonController.deletePolygon);
router.delete("/", polygonController.deleteAllPolygons);

// Bulk operations
router.post("/bulk", validatePolygon, polygonController.createMultiplePolygons);
router.post("/delete-multiple", polygonController.deleteMultiplePolygons);
router.put("/bulk-update", polygonController.bulkUpdatePolygons);

// Marker associations
router.get("/marker/:markerId", polygonController.getPolygonsByMarker);
router.post("/:id/associate-marker", polygonController.associateWithMarker);
router.delete("/:id/dissociate-marker", polygonController.dissociateFromMarker);

// Geospatial queries
router.post("/within-bounds", polygonController.getPolygonsWithinBounds);
router.post("/intersects", polygonController.getPolygonsIntersecting);

export default router;
