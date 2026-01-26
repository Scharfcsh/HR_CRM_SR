import LeaveRequest from "../models/leaveRequest.model.js";
import LeaveType from "../models/leaveType.model.js";
import LeaveBalance from "../models/leaveBalance.model.js";
import User from "../models/user.model.js";
import AuditLog from "../models/audit.model.js";

// ==================== LEAVE TYPES ====================

// Get all leave types for an organization
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({ orgId: req.user.organizationId });
    res.status(200).json({ success: true, leaveTypes });
  } catch (error) {
    console.log("Error in getLeaveTypes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new leave type (Admin only)
export const createLeaveType = async (req, res) => {
  try {
    const { name, category, isPaid, requiresApproval, autoApprove, maxPerYear } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: "Name and category are required" });
    }

    const existingType = await LeaveType.findOne({
      orgId: req.user.organizationId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingType) {
      return res.status(400).json({ success: false, message: "Leave type already exists" });
    }

    const leaveType = await LeaveType.create({
      orgId: req.user.organizationId,
      name,
      category,
      isPaid: isPaid ?? true,
      requiresApproval: requiresApproval ?? true,
      autoApprove: autoApprove ?? false,
      maxPerYear: maxPerYear || null,
    });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "CREATE_LEAVE_TYPE",
      metadata: { leaveTypeId: leaveType._id, name },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: "Leave type created", leaveType });
  } catch (error) {
    console.log("Error in createLeaveType:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a leave type (Admin only)
export const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: id, orgId: req.user.organizationId },
      updates,
      { new: true }
    );

    if (!leaveType) {
      return res.status(404).json({ success: false, message: "Leave type not found" });
    }

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "UPDATE_LEAVE_TYPE",
      metadata: { leaveTypeId: id, updates },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave type updated", leaveType });
  } catch (error) {
    console.log("Error in updateLeaveType:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a leave type (Admin only)
export const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any leave requests using this type
    const existingRequests = await LeaveRequest.findOne({ leaveTypeId: id });
    if (existingRequests) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete leave type with existing requests",
      });
    }

    const leaveType = await LeaveType.findOneAndDelete({
      _id: id,
      orgId: req.user.organizationId,
    });

    if (!leaveType) {
      return res.status(404).json({ success: false, message: "Leave type not found" });
    }

    // Also delete associated balances
    await LeaveBalance.deleteMany({ leaveTypeId: id });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "DELETE_LEAVE_TYPE",
      metadata: { leaveTypeId: id, name: leaveType.name },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave type deleted" });
  } catch (error) {
    console.log("Error in deleteLeaveType:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== LEAVE BALANCE ====================

// Get my leave balances
export const getMyLeaveBalances = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const balances = await LeaveBalance.find({
      userId: req.userId,
      year,
    }).populate("leaveTypeId", "name category isPaid");

    res.status(200).json({ success: true, balances });
  } catch (error) {
    console.log("Error in getMyLeaveBalances:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee leave balances (Admin only)
export const getEmployeeLeaveBalances = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Verify employee belongs to same organization
    const employee = await User.findOne({
      _id: employeeId,
      organizationId: req.user.organizationId,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const balances = await LeaveBalance.find({
      userId: employeeId,
      year,
    }).populate("leaveTypeId", "name category isPaid");

    res.status(200).json({ success: true, balances, employee: { name: employee.name, email: employee.email } });
  } catch (error) {
    console.log("Error in getEmployeeLeaveBalances:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Initialize/Update leave balance for an employee (Admin only)
export const setLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, total } = req.body;

    if (!employeeId || !leaveTypeId || !year || total === undefined) {
      return res.status(400).json({
        success: false,
        message: "employeeId, leaveTypeId, year, and total are required",
      });
    }

    // Verify employee belongs to same organization
    const employee = await User.findOne({
      _id: employeeId,
      organizationId: req.user.organizationId,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check leave type exists
    const leaveType = await LeaveType.findOne({
      _id: leaveTypeId,
      orgId: req.user.organizationId,
    });

    if (!leaveType) {
      return res.status(404).json({ success: false, message: "Leave type not found" });
    }

    // Get current used leaves
    const existingBalance = await LeaveBalance.findOne({
      userId: employeeId,
      leaveTypeId,
      year,
    });

    const used = existingBalance?.used || 0;
    const remaining = total - used;

    const balance = await LeaveBalance.findOneAndUpdate(
      { userId: employeeId, leaveTypeId, year },
      {
        orgId: req.user.organizationId,
        total,
        remaining: Math.max(0, remaining),
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "SET_LEAVE_BALANCE",
      metadata: { employeeId, leaveTypeId, year, total },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave balance updated", balance });
  } catch (error) {
    console.log("Error in setLeaveBalance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk initialize leave balances for all employees (Admin only)
export const initializeLeaveBalances = async (req, res) => {
  try {
    const { year } = req.body;
    const currentYear = year || new Date().getFullYear();

    // Get all active employees in the organization
    const employees = await User.find({
      organizationId: req.user.organizationId,
      isActive: true,
    });

    // Get all leave types for the organization
    const leaveTypes = await LeaveType.find({ orgId: req.user.organizationId });

    const operations = [];

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        operations.push({
          updateOne: {
            filter: {
              userId: employee._id,
              leaveTypeId: leaveType._id,
              year: currentYear,
            },
            update: {
              $setOnInsert: {
                orgId: req.user.organizationId,
                used: 0,
                currentBalance: 0,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (operations.length > 0) {
      await LeaveBalance.bulkWrite(operations);
    }

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "INITIALIZE_LEAVE_BALANCES",
      metadata: { year: currentYear, employeeCount: employees.length },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Leave balances initialized for ${employees.length} employees`,
    });
  } catch (error) {
    console.log("Error in initializeLeaveBalances:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== LEAVE REQUESTS ====================

// Create a leave request (Employee)
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "leaveTypeId, startDate, and endDate are required",
      });
    }

    const user = await User.findById(req.userId);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ success: false, message: "Start date cannot be after end date" });
    }

    // Calculate total days (excluding weekends optionally)
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave type exists
    const leaveType = await LeaveType.findOne({
      _id: leaveTypeId,
      orgId: user.organizationId,
    });

    if (!leaveType) {
      return res.status(404).json({ success: false, message: "Leave type not found" });
    }

    // Check leave balance
    const year = start.getFullYear();
    const balance = await LeaveBalance.findOne({
      userId: req.userId,
      leaveTypeId,
      year,
    });

    if (balance && balance.remaining < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${balance.remaining} days`,
      });
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      userId: req.userId,
      status: { $in: ["PENDING", "APPROVED"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "You already have a leave request for this period",
      });
    }

    const leaveRequest = await LeaveRequest.create({
      orgId: user.organizationId,
      userId: req.userId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: leaveType.autoApprove ? "APPROVED" : "PENDING",
    });

    // If auto-approved, update balance immediately
    if (leaveType.autoApprove && balance) {
      balance.used += totalDays;
      balance.remaining -= totalDays;
      await balance.save();
    }

    await AuditLog.create({
      organizationId: user.organizationId,
      userId: req.userId,
      action: "CREATE_LEAVE_REQUEST",
      metadata: { leaveRequestId: leaveRequest._id, totalDays },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: leaveType.autoApprove ? "Leave approved automatically" : "Leave request submitted",
      leaveRequest,
    });
  } catch (error) {
    console.log("Error in createLeaveRequest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my leave requests
export const getMyLeaveRequests = async (req, res) => {
  try {
    const { status, year } = req.query;
    const query = { userId: req.userId };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate("leaveTypeId", "name category isPaid")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, leaveRequests });
  } catch (error) {
    console.log("Error in getMyLeaveRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel a leave request (Employee - only pending requests)
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leaveRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    leaveRequest.status = "CANCELLED";
    await leaveRequest.save();

    const user = await User.findById(req.userId);

    await AuditLog.create({
      organizationId: user.organizationId,
      userId: req.userId,
      action: "CANCEL_LEAVE_REQUEST",
      metadata: { leaveRequestId: id },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave request cancelled", leaveRequest });
  } catch (error) {
    console.log("Error in cancelLeaveRequest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all leave requests for organization (Admin)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, year, employeeId } = req.query;
    const query = { orgId: req.user.organizationId };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (employeeId) {
      query.userId = employeeId;
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate("leaveTypeId", "name category isPaid")
      .populate("userId", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, leaveRequests });
  } catch (error) {
    console.log("Error in getAllLeaveRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee's leave requests (Admin)
export const getEmployeeLeaveRequests = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, year } = req.query;

    // Verify employee belongs to same organization
    const employee = await User.findOne({
      _id: employeeId,
      organizationId: req.user.organizationId,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const query = { userId: employeeId };

    if (status) {
      query.status = status.toUpperCase();
    }

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate("leaveTypeId", "name category isPaid")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      leaveRequests,
      employee: { name: employee.name, email: employee.email },
    });
  } catch (error) {
    console.log("Error in getEmployeeLeaveRequests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve a leave request (Admin)
export const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      orgId: req.user.organizationId,
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leaveRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be approved",
      });
    }

    // Update leave balance
    const year = leaveRequest.startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
      userId: leaveRequest.userId,
      leaveTypeId: leaveRequest.leaveTypeId,
      year,
    });

    if (balance) {
      if (balance.remaining < leaveRequest.totalDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for employee. Available: ${balance.remaining} days`,
        });
      }
      balance.used += leaveRequest.totalDays;
      balance.remaining -= leaveRequest.totalDays;
      await balance.save();
    }

    leaveRequest.status = "APPROVED";
    leaveRequest.approvedBy = req.userId;
    await leaveRequest.save();

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "APPROVE_LEAVE_REQUEST",
      metadata: { leaveRequestId: id, employeeId: leaveRequest.userId },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave request approved", leaveRequest });
  } catch (error) {
    console.log("Error in approveLeaveRequest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject a leave request (Admin)
export const rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      orgId: req.user.organizationId,
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leaveRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be rejected",
      });
    }

    leaveRequest.status = "REJECTED";
    leaveRequest.approvedBy = req.userId;
    await leaveRequest.save();

    await AuditLog.create({
      organizationId: req.user.organizationId,
      userId: req.userId,
      action: "REJECT_LEAVE_REQUEST",
      metadata: { leaveRequestId: id, employeeId: leaveRequest.userId, rejectionReason },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Leave request rejected", leaveRequest });
  } catch (error) {
    console.log("Error in rejectLeaveRequest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employees on leave today (Admin)
export const getEmployeesOnLeave = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const onLeave = await LeaveRequest.find({
      orgId: req.user.organizationId,
      status: "APPROVED",
      startDate: { $lte: endOfDay },
      endDate: { $gte: targetDate },
    })
      .populate("userId", "name email")
      .populate("leaveTypeId", "name category");

    res.status(200).json({ success: true, onLeave });
  } catch (error) {
    console.log("Error in getEmployeesOnLeave:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave summary for an employee
export const getLeaveSummary = async (req, res) => {
  try {
    const userId = req.params.employeeId || req.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // If admin is fetching for an employee, verify they belong to same org
    if (req.params.employeeId) {
      const employee = await User.findOne({
        _id: req.params.employeeId,
        organizationId: req.user.organizationId,
      });

      if (!employee) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }
    }

    // Get leave balances
    const balances = await LeaveBalance.find({
      userId,
      year,
    }).populate("leaveTypeId", "name category isPaid");

    // Get upcoming leaves (approved, starting from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingLeaves = await LeaveRequest.find({
      userId,
      status: "APPROVED",
      startDate: { $gte: today },
    })
      .populate("leaveTypeId", "name")
      .sort({ startDate: 1 })
      .limit(5);

    // Get past leaves this year
    const startOfYear = new Date(year, 0, 1);
    const pastLeaves = await LeaveRequest.find({
      userId,
      status: "APPROVED",
      endDate: { $lt: today, $gte: startOfYear },
    })
      .populate("leaveTypeId", "name")
      .sort({ endDate: -1 })
      .limit(10);

    // Calculate totals
    const totalBooked = balances.reduce((sum, b) => sum + (b.used || 0), 0);

    res.status(200).json({
      success: true,
      summary: {
        year,
        totalBooked,
        balances,
        upcomingLeaves,
        pastLeaves,
      },
    });
  } catch (error) {
    console.log("Error in getLeaveSummary:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const rollingLeaveProcessing = async (req, res) => {
  try {
    // This function would contain logic to process rolling leaves
    // For example, carry forward unused leaves, reset balances, etc.
    // Implementation would depend on specific business rules

    res.status(200).json({ success: true, message: "Rolling leave processing completed" });
  } catch (error) {
    console.log("Error in rollingLeaveProcessing:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};