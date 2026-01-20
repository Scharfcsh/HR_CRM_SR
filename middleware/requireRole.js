import User from "../models/user.model.js";

export const requireRole = (...allowedRoles) => {
	return async (req, res, next) => {
		try {
			const user = await User.findById(req.userId);

			if (!user) {
				return res.status(404).json({ success: false, message: "User not found" });
			}

			if (!user.isActive) {
				return res.status(403).json({ success: false, message: "Account is deactivated" });
			}

			if (!allowedRoles.includes(user.role)) {
				return res.status(403).json({ 
					success: false, 
					message: "Insufficient permissions" 
				});
			}

			req.user = {
				id: user._id,
				role: user.role,
				organizationId: user.organizationId,
				name: user.name,
				email: user.email,
				isVerified: user.isVerified,
				isActive: user.isActive,
			};
			// console.log("User role verified: ", req.user)
			next();
		} catch (error) {
			console.log("Error in requireRole ", error);
			return res.status(500).json({ success: false, message: "Server error" });
		}
	};
};
