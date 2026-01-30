import AuditLog from "../models/audit.model.js";

const ALLOWED_ACTIONS = [
  "INVITATION_SENT",
  "INVITATION_ACCEPTED",
  "USER_ACTIVATED",
  "USER_DEACTIVATED",
  "USER_CREATED",
  "USER_DELETED",
  "PASSWORD_CHANGED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "DATA_EXPORT",
  "DATA_IMPORT",
  "PERMISSION_CHANGED",
  "CHECK_IN",
  "CHECK_OUT",
  "PROFILE_UPDATED",
  "ORGANIZATION_SETTINGS_UPDATED",
  "NOTIFICATION_PREFERENCES_UPDATED",
  "LEAVE_POLICY_UPDATED",
  "ATTENDANCE_POLICY_UPDATED"
  ,"WORKING_HOURS_UPDATED",
  "ORGANIZATION_INFO_UPDATED",
  "INVITATION_REVOKED",
];

export const getAuditLogs = async (req, res) => {
	try {
		const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;

		const filter = { organizationId: req.user.organizationId };

		if (action) {
			filter.action = action;
		}

		if (userId) {
			filter.userId = userId;
		}

		if (startDate || endDate) {
			filter.createdAt = {};
			if (startDate) filter.createdAt.$gte = new Date(startDate);
			if (endDate) filter.createdAt.$lte = new Date(endDate);
		}

		const logs = await AuditLog.find(filter)
			.populate("userId", "email role")
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const count = await AuditLog.countDocuments(filter);

		res.status(200).json({
			success: true,
			logs,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
			total: count,
		});
	} catch (error) {
		console.log("Error in getAuditLogs ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};


export const getActionLogs = async (req, res) => {
  try {
    const { actions } = req.body;
    const organizationId = req.user.organizationId;

    // ✅ Validate body
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        message: "Actions must be a non-empty array",
      });
    }

    // ✅ Validate allowed actions
    const invalidActions = actions.filter(
      action => !ALLOWED_ACTIONS.includes(action)
    );

    if (invalidActions.length > 0) {
      return res.status(400).json({
        message: "Invalid audit actions",
        invalidActions,
      });
    }

    
    const logs = await AuditLog.find({
      organizationId,
      action: { $in: actions },
    }).populate("userId", "email name").limit(10)
	.sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs,
    });
  } catch (error) {
    console.error("Error in getActionLogs", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
