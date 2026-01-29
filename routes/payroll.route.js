import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  // Admin routes
  setSalaryStructure,
  getAllSalaryStructures,
  generatePayroll,
  getAllPayrolls,
  updatePayroll,
  markPayrollPaid,
  getPayrollSummary,
  deletePayroll,
  // Employee routes
  getMySalaryStructure,
  getMyPayslips,
  getPayslipById,
} from "../controllers/payroll.controller.js";

const router = express.Router();

// ============== ADMIN ROUTES ==============

// Salary Structure Management
router.post(
  "/salary-structure",
  verifyToken,
  requireRole("ADMIN"),
  setSalaryStructure,
);

router.get(
  "/salary-structures",
  verifyToken,
  requireRole("ADMIN"),
  getAllSalaryStructures,
);

// Payroll Management
router.post("/generate", verifyToken, requireRole("ADMIN"), generatePayroll);

router.get("/all", verifyToken, requireRole("ADMIN"), getAllPayrolls);

router.get("/summary", verifyToken, requireRole("ADMIN"), getPayrollSummary);

router.put("/:id", verifyToken, requireRole("ADMIN"), updatePayroll);

router.put(
  "/:id/mark-paid",
  verifyToken,
  requireRole("ADMIN"),
  markPayrollPaid,
);

router.delete("/:id", verifyToken, requireRole("ADMIN"), deletePayroll);

// ============== EMPLOYEE ROUTES ==============

// My Salary Structure
router.get(
  "/my-salary",
  verifyToken,
  requireRole("EMPLOYEE", "ADMIN"),
  getMySalaryStructure,
);

// My Payslips
router.get(
  "/my-payslips",
  verifyToken,
  requireRole("EMPLOYEE", "ADMIN"),
  getMyPayslips,
);

// Get specific payslip (works for both admin and employee)
router.get(
  "/payslip/:id",
  verifyToken,
  requireRole("EMPLOYEE", "ADMIN"),
  getPayslipById,
);

export default router;
