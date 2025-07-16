import { Router } from "express";
import * as authController from "../../controllers/admin/auth.controller.js";
const router = Router();

router.post("/register", authController.registerAdmin);
router.post("/login", authController.login);

export default router;