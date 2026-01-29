import Payroll from "../models/payroll.model.js";
import SalaryStructure from "../models/salaryStructure.model.js";
import EmployeeProfile from "../models/employee.model.js";
import User from "../models/user.model.js";
import AuditLog from "../models/audit.model.js";

// ============== ADMIN CONTROLLERS ==============

// Create/Update salary structure for an employee
export const setSalaryStructure = async (req, res) => {
  try {
    const { userId, grossSalary, bankName, accountNumber, ifscCode } = req.body;

    const user = await User.findById(userId);
    if (
      !user ||
      user.organizationId.toString() !== req.user.organizationId.toString()
    ) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const employee = await EmployeeProfile.findOne({ userId });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee profile not found" });
    }

    // Calculate salary breakdown
    const breakdown = SalaryStructure.calculateBreakdown(grossSalary);

    const salaryStructure = await SalaryStructure.findOneAndUpdate(
      { userId },
      {
        organizationId: req.user.organizationId,
        userId,
        employeeId: employee._id,
        ...breakdown,
        bankName,
        accountNumber,
        ifscCode,
        effectiveFrom: new Date(),
        isActive: true,
      },
      { upsert: true, new: true },
    );

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "SALARY_STRUCTURE_UPDATED",
      metadata: { targetUserId: userId, grossSalary },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Salary structure updated successfully",
      salaryStructure,
    });
  } catch (error) {
    console.error("Error in setSalaryStructure:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all salary structures for organization
export const getAllSalaryStructures = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const salaryStructures = await SalaryStructure.find({
      organizationId: req.user.organizationId,
      isActive: true,
    })
      .populate("userId", "email name")
      .populate("employeeId", "fullName employeeId position department")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await SalaryStructure.countDocuments({
      organizationId: req.user.organizationId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      salaryStructures,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error("Error in getAllSalaryStructures:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate payroll for a specific month
export const generatePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    console.log("Generating payroll for:", { month, year });
    // const userId = req.userId;

    // If userId is provided, generate for specific employee, otherwise for all
    const query = {
      organizationId: req.user.organizationId,
      isActive: true,
    };
    // if (userId) query.userId = userId;

    const salaryStructures =
      await SalaryStructure.find(query).populate("employeeId");

    const payrolls = [];
    const errors = [];

    for (const structure of salaryStructures) {
      console.log("Processing salary structure for userId:", structure);
      try {
        const payroll = await Payroll.create({
          organizationId: structure.organizationId,
          userId: structure.userId,
          employeeId: structure.employeeId._id,
          grossSalary: structure.grossSalary,
          basicSalary: structure.basicSalary,
          hra: structure.hra,
          otherAllowances: structure.otherAllowances,
          month,
          year,
          status: "DRAFT",
        });
        payrolls.push(payroll);
      } catch (err) {
        if (err.code === 11000) {
          errors.push({
            userId: structure.userId,
            message: "Payroll already exists for this month",
          });
        } else {
          throw err;
        }
      }
    }

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "PAYROLL_GENERATED",
      metadata: { month, year, count: payrolls.length },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Generated ${payrolls.length} payroll records`,
      payrolls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in generatePayroll:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all payrolls for organization
export const getAllPayrolls = async (req, res) => {
  try {
    const { month, year, status, page = 1, limit = 10 } = req.query;

    const filter = { organizationId: req.user.organizationId };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const payrolls = await Payroll.find(filter)
      .populate("userId", "email name")
      .populate("employeeId", "fullName employeeId position department")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payroll.countDocuments(filter);

    // Calculate totals
    const totals = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalGross: { $sum: "$grossSalary" },
          totalNet: { $sum: "$netSalary" },
          totalDeductions: { $sum: "$totalDeductions" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      payrolls,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
      summary: totals[0] || { totalGross: 0, totalNet: 0, totalDeductions: 0 },
    });
  } catch (error) {
    console.error("Error in getAllPayrolls:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update payroll (add deductions, incentives, etc.)
export const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reimbursement,
      incentives,
      arrears,
      tdsDeduction,
      otherDeductions,
      lopDays,
      status,
    } = req.body;

    const payroll = await Payroll.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll not found" });
    }

    if (reimbursement !== undefined) payroll.reimbursement = reimbursement;
    if (incentives !== undefined) payroll.incentives = incentives;
    if (arrears !== undefined) payroll.arrears = arrears;
    if (tdsDeduction !== undefined) payroll.tdsDeduction = tdsDeduction;
    if (otherDeductions !== undefined)
      payroll.otherDeductions = otherDeductions;
    if (lopDays !== undefined) payroll.lopDays = lopDays;
    if (status) payroll.status = status;

    await payroll.save();

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "PAYROLL_UPDATED",
      metadata: { payrollId: id, changes: req.body },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      payroll,
    });
  } catch (error) {
    console.error("Error in updatePayroll:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark payroll as paid
export const markPayrollPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const payroll = await Payroll.findOneAndUpdate(
      { _id: id, organizationId: req.user.organizationId },
      {
        status: "PAID",
        paidOn: new Date(),
        paymentMethod,
        transactionId,
      },
      { new: true },
    );

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll not found" });
    }

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "PAYROLL_MARKED_PAID",
      metadata: { payrollId: id, paymentMethod, transactionId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Payroll marked as paid",
      payroll,
    });
  } catch (error) {
    console.error("Error in markPayrollPaid:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payroll summary for organization
export const getPayrollSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const summary = await Payroll.aggregate([
      {
        $match: {
          organizationId: req.user.organizationId,
          year: parseInt(currentYear),
        },
      },
      {
        $group: {
          _id: { month: "$month", status: "$status" },
          totalAmount: { $sum: "$netSalary" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      summary,
      year: currentYear,
    });
  } catch (error) {
    console.error("Error in getPayrollSummary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============== EMPLOYEE CONTROLLERS ==============

// Get my salary structure
export const getMySalaryStructure = async (req, res) => {
  try {
    const salaryStructure = await SalaryStructure.findOne({
      userId: req.userId,
      isActive: true,
    });

    if (!salaryStructure) {
      return res.status(404).json({
        success: false,
        message: "Salary structure not found. Please contact HR.",
      });
    }

    // Calculate per day salary
    const perDaySalary = salaryStructure.grossSalary / 30;

    res.status(200).json({
      success: true,
      salaryStructure: {
        grossSalary: salaryStructure.grossSalary,
        basicSalary: salaryStructure.basicSalary,
        hra: salaryStructure.hra,
        otherAllowances: salaryStructure.otherAllowances,
        perDaySalary: Math.round(perDaySalary * 100) / 100,
        effectiveFrom: salaryStructure.effectiveFrom,
      },
    });
  } catch (error) {
    console.error("Error in getMySalaryStructure:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my payslips
export const getMyPayslips = async (req, res) => {
  try {
    const { year, page = 1, limit = 12 } = req.query;

    const filter = { userId: req.userId };
    if (year) filter.year = parseInt(year);

    const payslips = await Payroll.find(filter)
      .sort({ year: -1, month: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payroll.countDocuments(filter);

    res.status(200).json({
      success: true,
      payslips,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Error in getMyPayslips:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get specific payslip
export const getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;

    // For admin, allow access to any payslip in org
    // For employee, only their own
    const filter = { _id: id };

    if (req.user.role === "ADMIN") {
      filter.organizationId = req.user.organizationId;
    } else {
      filter.userId = req.userId;
    }

    const payslip = await Payroll.findOne(filter)
      .populate("userId", "email name")
      .populate(
        "employeeId",
        "fullName employeeId position department dateOfJoining panEncrypted",
      );

    if (!payslip) {
      return res
        .status(404)
        .json({ success: false, message: "Payslip not found" });
    }

    res.status(200).json({
      success: true,
      payslip,
    });
  } catch (error) {
    console.error("Error in getPayslipById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete payroll (admin only, only if not paid)
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll not found" });
    }

    if (payroll.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a paid payroll record",
      });
    }

    await Payroll.deleteOne({ _id: id });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "PAYROLL_DELETED",
      metadata: { payrollId: id, month: payroll.month, year: payroll.year },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Payroll deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePayroll:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
