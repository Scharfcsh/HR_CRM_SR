import express from "express";
import {
	getDailyAttendanceReport,
	getWeeklyAttendanceReport,
	getMonthlyAttendanceReport,
} from "../controllers/report.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.get("/attendance/daily", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getDailyAttendanceReport);
router.get("/attendance/weekly", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getWeeklyAttendanceReport);
router.get("/attendance/monthly", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getMonthlyAttendanceReport);

export default router;
