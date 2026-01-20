import express from "express";
import {
	listUsers,
	getUser,
	updateUserStatus,
	getMyProfile,
	getAllUsers,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.get("/", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), listUsers);
router.get("/:organizationId", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getAllUsers);
router.get("/me", verifyToken, getMyProfile);
router.get("/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getUser);
router.patch("/:id/status", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateUserStatus);

export default router;
