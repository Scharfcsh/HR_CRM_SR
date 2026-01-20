import express from "express";
import {
	createOrganization,
	getMyOrganization,
	updateOrganizationSettings,
} from "../controllers/organization.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.post("/", verifyToken, requireRole("SUPER_ADMIN"), createOrganization);
router.get("/me", verifyToken, getMyOrganization);
router.patch("/settings", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateOrganizationSettings);

export default router;
