import express from "express";
import {
	createInvitation,
	validateInvitation,
	acceptInvitation,
	listInvitations,
	revokeInvitation,
	getInviteStatusNo,
} from "../controllers/invitation.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.post("/", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), createInvitation);
router.get("/validate", validateInvitation); // Public
router.post("/accept", acceptInvitation); // Public
router.get("/status", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getInviteStatusNo);
router.get("/", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), listInvitations);
router.delete("/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), revokeInvitation);

export default router;
