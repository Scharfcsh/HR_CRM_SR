import Organization from "../models/organization.model.js";
import AuditLog from "../models/audit.model.js";

export const createOrganization = async (req, res) => {
	try {
		const { name, timezone } = req.body;

		if (!name) {
			return res.status(400).json({ success: false, message: "Organization name is required" });
		}

		const organization = await Organization.create({
			name,
			timezone: timezone || "Asia/Kolkata",
		});

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_CREATED",
			metadata: { organizationName: name },
			ipAddress: req.ip,
		});

		res.status(201).json({
			success: true,
			message: "Organization created successfully",
			organization,
		});
	} catch (error) {
		console.log("Error in createOrganization ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getMyOrganization = async (req, res) => {
	try {
		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		res.status(200).json({
			success: true,
			organization,
		});
	} catch (error) {
		console.log("Error in getMyOrganization ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const updateOrganizationSettings = async (req, res) => {
	try {
		const { workingHours, attendancePolicy, timezone } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		if (workingHours) {
			organization.workingHours = { ...organization.workingHours, ...workingHours };
		}

		if (attendancePolicy) {
			organization.attendancePolicy = { ...organization.attendancePolicy, ...attendancePolicy };
		}

		if (timezone) {
			organization.timezone = timezone;
		}

		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_SETTINGS_UPDATED",
			metadata: { workingHours, attendancePolicy, timezone },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Organization settings updated successfully",
			organization,
		});
	} catch (error) {
		console.log("Error in updateOrganizationSettings ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};



