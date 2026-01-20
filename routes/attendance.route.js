import express from "express";
import {
	checkIn,
	checkOut,
	getMyAttendance,
	getAllAttendance,
	getAttendanceById,
	updateAttendance,
	getTodaysAttendanceCount,
} from "../controllers/attendance.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.post("/check-in", verifyToken, checkIn);
router.post("/check-out", verifyToken, checkOut);
router.get("/me", verifyToken, getMyAttendance);
router.get("/", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getAllAttendance);
router.get("/today", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getTodaysAttendanceCount);

router.get("/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getAttendanceById);
router.patch("/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateAttendance);

export default router;
