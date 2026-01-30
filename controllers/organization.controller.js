import Organization from "../models/organization.model.js";
import AuditLog from "../models/audit.model.js";
import LeaveType from "../models/leaveType.model.js";
import LeaveBalance from "../models/leaveBalance.model.js";
import User from "../models/user.model.js";
import cloudinary from "../cloudinary/config.cloudinary.js";

// Leave type mappings - maps organization leave policy fields to LeaveType records
const LEAVE_TYPE_MAPPINGS = [
	{ policyField: "annualLeave", name: "Annual Leave", category: "ANNUAL", isPaid: true },
	{ policyField: "sickLeave", name: "Sick Leave", category: "MEDICAL", isPaid: true },
	{ policyField: "casualLeave", name: "Casual Leave", category: "PERSONAL", isPaid: true },
	{ policyField: "maternityLeave", name: "Maternity Leave", category: "PERSONAL", isPaid: true },
	{ policyField: "paternityLeave", name: "Paternity Leave", category: "PERSONAL", isPaid: true },
	{ policyField: "unpaidLeave", name: "Unpaid Leave", category: "PERSONAL", isPaid: false },
];

// Helper function to sync leave types with organization leave policy
const syncLeaveTypesWithPolicy = async (orgId, leavePolicy) => {
	const syncedLeaveTypes = [];

	for (const mapping of LEAVE_TYPE_MAPPINGS) {
		const maxPerYear = leavePolicy[mapping.policyField];

		// Skip if the leave type has 0 days (disabled)
		if (maxPerYear === 0) {
			// Delete the leave type if it exists and is set to 0
			await LeaveType.findOneAndDelete({
				orgId,
				name: mapping.name,
			});
			continue;
		}

		// Upsert: Update if exists, create if not
		const leaveType = await LeaveType.findOneAndUpdate(
			{ orgId, name: mapping.name },
			{
				$set: {
					category: mapping.category,
					isPaid: mapping.isPaid,
					requiresApproval: true,
					autoApprove: false,
					maxPerYear: maxPerYear,
					carryForward: mapping.category === "ANNUAL",
				},
				$setOnInsert: {
					orgId,
					name: mapping.name,
				},
			},
			{ upsert: true, new: true }
		);

		syncedLeaveTypes.push(leaveType);
	}

	return syncedLeaveTypes;
};

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

		// Create default leave types based on the default leave policy
		const defaultLeaveTypes = await syncLeaveTypesWithPolicy(
			organization._id,
			organization.leavePolicy
		);

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_CREATED",
			metadata: { organizationName: name, defaultLeaveTypes: defaultLeaveTypes.map(lt => lt.name) },
			ipAddress: req.ip,
		});

		res.status(201).json({
			success: true,
			message: "Organization created successfully",
			organization,
			leaveTypes: defaultLeaveTypes,
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

// Update organization basic info
export const updateOrganizationInfo = async (req, res) => {
	try {
		const { name, industry, address, phone, website, logo, timezone } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		if (name) organization.name = name;
		if (industry !== undefined) organization.industry = industry;
		if (address !== undefined) organization.address = address;
		if (phone !== undefined) organization.phone = phone;
		if (website !== undefined) organization.website = website;
		if (logo !== undefined) organization.logo = logo;
		if (timezone) organization.timezone = timezone;

		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_INFO_UPDATED",
			metadata: { name, industry, address, phone, website, timezone },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Organization info updated successfully",
			organization,
		});
	} catch (error) {
		console.log("Error in updateOrganizationInfo ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Update working hours and week offs
export const updateWorkingHours = async (req, res) => {
	try {
		const { workingHours, weekOffs } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		if (workingHours) {
			organization.workingHours = {
				...organization.workingHours.toObject(),
				...workingHours,
			};
		}

		if (weekOffs && Array.isArray(weekOffs)) {
			organization.weekOffs = weekOffs;
		}

		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "WORKING_HOURS_UPDATED",
			metadata: { workingHours, weekOffs },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Working hours updated successfully",
			organization,
		});
	} catch (error) {
		console.log("Error in updateWorkingHours ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Update attendance policy
export const updateAttendancePolicy = async (req, res) => {
	try {
		const { attendancePolicy } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		// Check if attendance policy was already configured
		if (organization.attendancePolicyConfigured) {
			return res.status(403).json({
				success: false,
				message: "Attendance policy has already been configured. Please contact the help desk to make changes.",
				policyLocked: true,
			});
		}

		if (attendancePolicy) {
			organization.attendancePolicy = {
				...organization.attendancePolicy.toObject(),
				...attendancePolicy,
			};
			organization.attendancePolicyConfigured = true;
		}

		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ATTENDANCE_POLICY_UPDATED",
			metadata: { attendancePolicy },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Attendance policy configured successfully. Note: This can only be set once.",
			organization,
		});
	} catch (error) {
		console.log("Error in updateAttendancePolicy ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Update leave policy
export const updateLeavePolicy = async (req, res) => {
	try {
		const { leavePolicy } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		// Check if leave policy was already configured
		if (organization.leavePolicyConfigured) {
			return res.status(403).json({
				success: false,
				message: "Leave policy has already been configured. Please contact the help desk to make changes.",
				policyLocked: true,
			});
		}

		if (leavePolicy) {
			organization.leavePolicy = {
				...organization.leavePolicy.toObject(),
				...leavePolicy,
			};
			organization.leavePolicyConfigured = true;
		}

		await organization.save();

		// Sync leave types with the updated leave policy
		const syncedLeaveTypes = await syncLeaveTypesWithPolicy(
			organization._id,
			organization.leavePolicy
		);

		// Initialize leave balances for all active employees
		const currentYear = new Date().getFullYear();
		const employees = await User.find({
			organizationId: organization._id,
			isActive: true,
		});

		const operations = [];
		for (const employee of employees) {
			for (const leaveType of syncedLeaveTypes) {
				operations.push({
					updateOne: {
						filter: {
							userId: employee._id,
							leaveTypeId: leaveType._id,
							year: currentYear,
						},
						update: {
							$setOnInsert: {
								orgId: organization._id,
								used: 0,
								currentBalance: leaveType.category === "ANNUAL" ? 0 : leaveType.maxPerYear,
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
			organizationId: organization._id,
			userId: req.userId,
			action: "LEAVE_POLICY_UPDATED",
			metadata: { 
				leavePolicy, 
				syncedLeaveTypes: syncedLeaveTypes.map(lt => lt.name),
				balancesInitialized: employees.length,
			},
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: `Leave policy configured successfully. Leave balances initialized for ${employees.length} employees. Note: This can only be set once.`,
			organization,
			leaveTypes: syncedLeaveTypes,
			balancesInitialized: employees.length,
		});
	} catch (error) {
		console.log("Error in updateLeavePolicy ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
	try {
		const { notificationPreferences } = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		if (notificationPreferences) {
			// Deep merge notification preferences
			const currentPrefs = organization.notificationPreferences.toObject();
			
			for (const key of Object.keys(notificationPreferences)) {
				if (currentPrefs[key] && typeof notificationPreferences[key] === 'object') {
					currentPrefs[key] = {
						...currentPrefs[key],
						...notificationPreferences[key],
					};
				} else {
					currentPrefs[key] = notificationPreferences[key];
				}
			}
			
			organization.notificationPreferences = currentPrefs;
		}

		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "NOTIFICATION_PREFERENCES_UPDATED",
			metadata: { notificationPreferences },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Notification preferences updated successfully",
			organization,
		});
	} catch (error) {
		console.log("Error in updateNotificationPreferences ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Legacy endpoint - update all settings at once
// NOTE: This endpoint should be deprecated. Use individual endpoints instead.
export const updateOrganizationSettings = async (req, res) => {
	try {
		const { 
			workingHours, 
			attendancePolicy, 
			timezone, 
			weekOffs,
			leavePolicy,
			notificationPreferences 
		} = req.body;

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		// Check if trying to update locked policies
		if (attendancePolicy && organization.attendancePolicyConfigured) {
			return res.status(403).json({
				success: false,
				message: "Attendance policy has already been configured. Please contact the help desk to make changes.",
				policyLocked: true,
			});
		}

		if (leavePolicy && organization.leavePolicyConfigured) {
			return res.status(403).json({
				success: false,
				message: "Leave policy has already been configured. Please contact the help desk to make changes.",
				policyLocked: true,
			});
		}

		if (workingHours) {
			organization.workingHours = { 
				...organization.workingHours.toObject(), 
				...workingHours 
			};
		}

		if (attendancePolicy) {
			organization.attendancePolicy = { 
				...organization.attendancePolicy.toObject(), 
				...attendancePolicy 
			};
			organization.attendancePolicyConfigured = true;
		}

		if (leavePolicy) {
			organization.leavePolicy = { 
				...organization.leavePolicy.toObject(), 
				...leavePolicy 
			};
			organization.leavePolicyConfigured = true;
		}

		if (notificationPreferences) {
			const currentPrefs = organization.notificationPreferences.toObject();
			for (const key of Object.keys(notificationPreferences)) {
				if (currentPrefs[key] && typeof notificationPreferences[key] === 'object') {
					currentPrefs[key] = {
						...currentPrefs[key],
						...notificationPreferences[key],
					};
				} else {
					currentPrefs[key] = notificationPreferences[key];
				}
			}
			organization.notificationPreferences = currentPrefs;
		}

		if (timezone) {
			organization.timezone = timezone;
		}

		if (weekOffs && Array.isArray(weekOffs)) {
			organization.weekOffs = weekOffs;
		}

		await organization.save();

		// Sync leave types and initialize balances if leave policy was updated
		let syncedLeaveTypes = [];
		let balancesInitialized = 0;
		if (leavePolicy) {
			syncedLeaveTypes = await syncLeaveTypesWithPolicy(
				organization._id,
				organization.leavePolicy
			);

			// Initialize leave balances for all active employees
			const currentYear = new Date().getFullYear();
			const employees = await User.find({
				organizationId: organization._id,
				isActive: true,
			});

			const operations = [];
			for (const employee of employees) {
				for (const leaveType of syncedLeaveTypes) {
					operations.push({
						updateOne: {
							filter: {
								userId: employee._id,
								leaveTypeId: leaveType._id,
								year: currentYear,
							},
							update: {
								$setOnInsert: {
									orgId: organization._id,
									used: 0,
									currentBalance: leaveType.category === "ANNUAL" ? 0 : leaveType.maxPerYear,
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
			balancesInitialized = employees.length;
		}

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_SETTINGS_UPDATED",
			metadata: { 
				workingHours, 
				attendancePolicy, 
				timezone, 
				weekOffs, 
				leavePolicy, 
				notificationPreferences,
				syncedLeaveTypes: syncedLeaveTypes.map(lt => lt.name),
				balancesInitialized,
			},
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Organization settings updated successfully",
			organization,
			leaveTypes: syncedLeaveTypes.length > 0 ? syncedLeaveTypes : undefined,
			balancesInitialized: balancesInitialized > 0 ? balancesInitialized : undefined,
		});
	} catch (error) {
		console.log("Error in updateOrganizationSettings ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Get organization policies only
export const getOrganizationPolicies = async (req, res) => {
	try {
		const organization = await Organization.findById(req.user.organizationId)
			.select('workingHours weekOffs attendancePolicy attendancePolicyConfigured leavePolicy leavePolicyConfigured');

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		res.status(200).json({
			success: true,
			policies: {
				workingHours: organization.workingHours,
				weekOffs: organization.weekOffs,
				attendancePolicy: organization.attendancePolicy,
				attendancePolicyConfigured: organization.attendancePolicyConfigured,
				leavePolicy: organization.leavePolicy,
				leavePolicyConfigured: organization.leavePolicyConfigured,
			},
		});
	} catch (error) {
		console.log("Error in getOrganizationPolicies ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Get notification preferences only
export const getNotificationPreferences = async (req, res) => {
	try {
		const organization = await Organization.findById(req.user.organizationId)
			.select('notificationPreferences');

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		res.status(200).json({
			success: true,
			notificationPreferences: organization.notificationPreferences,
		});
	} catch (error) {
		console.log("Error in getNotificationPreferences ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Get organization leave types
export const getOrganizationLeaveTypes = async (req, res) => {
	try {
		const leaveTypes = await LeaveType.find({ 
			orgId: req.user.organizationId 
		}).sort({ name: 1 });

		res.status(200).json({
			success: true,
			leaveTypes,
		});
	} catch (error) {
		console.log("Error in getOrganizationLeaveTypes ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Initialize leave types for existing organization (one-time setup)
export const initializeOrganizationLeaveTypes = async (req, res) => {
	try {
		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		// Check if leave types already exist
		const existingTypes = await LeaveType.countDocuments({ 
			orgId: organization._id 
		});

		if (existingTypes > 0) {
			return res.status(400).json({ 
				success: false, 
				message: "Leave types already exist for this organization. Use update leave policy to modify them." 
			});
		}

		// Create leave types based on current leave policy
		const leaveTypes = await syncLeaveTypesWithPolicy(
			organization._id,
			organization.leavePolicy
		);

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "LEAVE_TYPES_INITIALIZED",
			metadata: { leaveTypes: leaveTypes.map(lt => lt.name) },
			ipAddress: req.ip,
		});

		res.status(201).json({
			success: true,
			message: "Leave types initialized successfully",
			leaveTypes,
		});
	} catch (error) {
		console.log("Error in initializeOrganizationLeaveTypes ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

// Update organization logo
export const updateOrganizationLogo = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		const organization = await Organization.findById(req.user.organizationId);

		if (!organization) {
			return res.status(404).json({ success: false, message: "Organization not found" });
		}

		// Delete old logo from Cloudinary if exists
		if (organization.logo) {
			try {
				// Extract public_id from the URL
				const urlParts = organization.logo.split('/');
				const publicIdWithExtension = urlParts.slice(-2).join('/'); // e.g., "org-logos/abc123"
				const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // Remove extension
				await cloudinary.uploader.destroy(publicId);
			} catch (deleteError) {
				console.log("Error deleting old logo:", deleteError);
				// Continue even if deletion fails
			}
		}

		// Upload new logo to Cloudinary
		const uploadResult = await new Promise((resolve, reject) => {
			cloudinary.uploader.upload_stream(
				{ 
					resource_type: 'image',
					folder: 'org-logos',
					transformation: [
						{ width: 400, height: 400, crop: 'limit' },
						{ quality: 'auto' }
					]
				}, 
				(error, result) => {
					if (error) {
						reject(error);
					} else {
						resolve(result);
					}
				}
			).end(req.file.buffer);
		});

		// Update organization with new logo URL
		organization.logo = uploadResult.secure_url;
		await organization.save();

		await AuditLog.create({
			organizationId: organization._id,
			userId: req.userId,
			action: "ORGANIZATION_LOGO_UPDATED",
			metadata: { 
				logoUrl: uploadResult.secure_url,
				publicId: uploadResult.public_id 
			},
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Organization logo updated successfully",
			logo: uploadResult.secure_url,
		});
	} catch (error) {
		console.log("Error in updateOrganizationLogo ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};
