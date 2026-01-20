import User from "../models/user.model.js";
import AuditLog from "../models/audit.model.js";

export const listUsers = async (req, res) => {
	try {
		const { page = 1, limit = 10, role, status } = req.query;

		const filter = { organizationId: req.user.organizationId };

		if (role) {
			filter.role = role;
		}

		if (status === "active") {
			filter.isActive = true;
		} else if (status === "inactive") {
			filter.isActive = false;
		}

		const users = await User.find(filter)
			.select("-passwordHash")
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const count = await User.countDocuments(filter);

		res.status(200).json({
			success: true,
			users,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
			total: count,
		});
	} catch (error) {
		console.log("Error in listUsers ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getAllUsers = async (req, res) => {
	try {
		const organizationId = req.params.organizationId;
		const users = await User.find({ organizationId: organizationId })
			.select("-passwordHash")
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			users,
			total: users.length,
		});
	}catch (error) {
		console.log("Error in getAllUsers ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getUser = async (req, res) => {
	try {
		const { id } = req.params;

		const user = await User.findOne({
			_id: id,
			organizationId: req.user.organizationId,
		}).select("-passwordHash");

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {
		console.log("Error in getUser ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const updateUserStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const { isActive } = req.body;

		if (typeof isActive !== "boolean") {
			return res.status(400).json({ success: false, message: "isActive must be a boolean" });
		}

		const user = await User.findOne({
			_id: id,
			organizationId: req.user.organizationId,
		});

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		// Prevent deactivating yourself
		if (user._id.toString() === req.userId) {
			return res.status(400).json({ success: false, message: "Cannot deactivate yourself" });
		}

		user.isActive = isActive;
		await user.save();

		await AuditLog.create({
			organizationId: req.user.organizationId,
			userId: req.userId,
			action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
			metadata: { targetUserId: id, email: user.email },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: `User ${isActive ? "activated" : "deactivated"} successfully`,
			user: {
				...user._doc,
				passwordHash: undefined,
			},
		});
	} catch (error) {
		console.log("Error in updateUserStatus ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getMyProfile = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-passwordHash");

		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {
		console.log("Error in getMyProfile ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};
