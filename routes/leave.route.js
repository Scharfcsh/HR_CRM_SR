import express from "express";
import {
  // Leave Types
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  // Leave Balance
  getMyLeaveBalances,
  getEmployeeLeaveBalances,
  setLeaveBalance,
  initializeLeaveBalances,
  // Leave Requests
  createLeaveRequest,
  getMyLeaveRequests,
  cancelLeaveRequest,
  getAllLeaveRequests,
  getEmployeeLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getEmployeesOnLeave,
  getLeaveSummary,
  rollingLeaveProcessing,
} from "../controllers/leave.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ==================== LEAVE TYPES ====================
// Get all leave types (any authenticated user)
router.get("/types", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), getLeaveTypes);

// Admin only - manage leave types
router.post("/types", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), createLeaveType);
router.patch("/types/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), updateLeaveType);
router.delete("/types/:id", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), deleteLeaveType);

// ==================== LEAVE BALANCE ====================
// Employee - get own balances
router.get("/balance/me", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), getMyLeaveBalances);

// Admin - manage balances
router.get("/balance/employee/:employeeId", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getEmployeeLeaveBalances);
router.post("/balance", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), setLeaveBalance);
router.post("/balance/initialize", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), initializeLeaveBalances);


// Super Admin - rolling leave processing 

router.patch("/balance/rolling", verifyToken, requireRole("SUPER_ADMIN"), rollingLeaveProcessing);




// ==================== LEAVE REQUESTS ====================
// Employee - manage own requests
router.post("/requests", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), createLeaveRequest);
router.get("/requests/me", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), getMyLeaveRequests);
router.patch("/requests/:id/cancel", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), cancelLeaveRequest);

// Admin - view and manage all requests
router.get("/requests", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getAllLeaveRequests);
router.get("/requests/employee/:employeeId", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getEmployeeLeaveRequests);
router.patch("/requests/:id/approve", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), approveLeaveRequest);
router.patch("/requests/:id/reject", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), rejectLeaveRequest);

// ==================== LEAVE SUMMARY & REPORTS ====================
// Get employees on leave (Admin)
router.get("/on-leave", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getEmployeesOnLeave);

// Get leave summary - employee gets own, admin can specify employee
router.get("/summary/me", verifyToken, requireRole("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), getLeaveSummary);
router.get("/summary/:employeeId", verifyToken, requireRole("SUPER_ADMIN", "ADMIN"), getLeaveSummary);

export default router;
