import express from "express";
import {
	createOrganization,
	getMyOrganization,
	updateOrganizationSettings,
	updateOrganizationInfo,
	updateWorkingHours,
	updateAttendancePolicy,
	updateLeavePolicy,
	updateNotificationPreferences,
	getOrganizationPolicies,
	getNotificationPreferences,
	getOrganizationLeaveTypes,
	initializeOrganizationLeaveTypes,
	updateOrganizationLogo,
} from "../controllers/organization.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";
import { upload } from "../cloudinary/config.cloudinary.js";

const router = express.Router();

// Create organization (SUPER_ADMIN only)
router.post("/", verifyToken, requireRole("SUPER_ADMIN"), createOrganization);

// Get organization
router.get("/me", verifyToken, getMyOrganization);

// Get policies (all authenticated users can view)
router.get("/policies", verifyToken, getOrganizationPolicies);

// Get notification preferences (all authenticated users can view)
router.get("/notifications", verifyToken, getNotificationPreferences);

// Get organization leave types (all authenticated users can view)
router.get("/leave-types", verifyToken, getOrganizationLeaveTypes);

// Initialize leave types for existing organization (ADMIN only, one-time setup)
router.post("/leave-types/initialize", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), initializeOrganizationLeaveTypes);

// Update endpoints (ADMIN and SUPER_ADMIN only)
router.patch("/settings", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateOrganizationSettings);
router.patch("/info", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateOrganizationInfo);
router.patch("/working-hours", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateWorkingHours);
router.patch("/attendance-policy", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateAttendancePolicy);
router.patch("/leave-policy", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateLeavePolicy);
router.patch("/notifications", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateNotificationPreferences);

// Upload organization logo (ADMIN and SUPER_ADMIN only)
router.patch("/logo", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), upload.single("logo"), updateOrganizationLogo);

export default router;
