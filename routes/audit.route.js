import express from "express";
import { getActionLogs, getAuditLogs } from "../controllers/audit.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

router.get("/", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getAuditLogs);
router.post("/action", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getActionLogs);

export default router;
