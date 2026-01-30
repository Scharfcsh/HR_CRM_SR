import EmployeeProfile from "../models/employee.model.js";
import User from "../models/user.model.js";
import AuditLog from "../models/audit.model.js";
import crypto from "crypto";
import { calculateEmployeeProfileCompletion } from "../utils/EmployeeProfileCompletion.js";

// Simple encryption functions (use proper encryption library in production)
const encrypt = (text) => {
	if (!text) return null;
	const algorithm = "aes-256-cbc";
	const key = Buffer.from(process.env.ENCRYPTION_KEY || "12345678901234567890123456789012", "utf-8");
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text) => {
	if (!text) return null;
	try {
		const algorithm = "aes-256-cbc";
		const key = Buffer.from(process.env.ENCRYPTION_KEY || "12345678901234567890123456789012", "utf-8");
		const parts = text.split(":");
		const iv = Buffer.from(parts[0], "hex");
		const encryptedText = parts[1];
		const decipher = crypto.createDecipheriv(algorithm, key, iv);
		let decrypted = decipher.update(encryptedText, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch (error) {
		return null;
	}
};


// export const updateMyEmployeeProfile = async (req, res) => {
// 	try {
// 		const { fullName, phone, pan, aadhaar, address, emergencyContact, dateOfJoining } = req.body;

// 		let profile = await EmployeeProfile.findOne({ userId: req.userId });

// 		if (!profile) {
// 			profile = new EmployeeProfile({
// 				userId: req.userId,
// 				organizationId: req.user.organizationId,
// 			});
// 		}

// 		if (fullName) profile.fullName = fullName;
// 		if (phone) profile.phone = phone;
// 		if (address) profile.address = address;
// 		if (emergencyContact) profile.emergencyContact = emergencyContact;
// 		if (dateOfJoining) profile.dateOfJoining = dateOfJoining;

// 		// Encrypt sensitive fields
// 		if (pan) {
// 			profile.panEncrypted = encrypt(pan);
// 		}
// 		if (aadhaar) {
// 			profile.aadhaarEncrypted = encrypt(aadhaar);
// 		}

// 		// Check if profile is completed
// 		profile.profileCompleted = !!(
// 			profile.fullName &&
// 			profile.phone &&
// 			profile.panEncrypted &&
// 			profile.aadhaarEncrypted &&
// 			profile.address
// 		);

// 		await profile.save();

// 		await AuditLog.create({
// 			organizationId: req.user.organizationId,
// 			userId: req.userId,
// 			action: "PROFILE_UPDATED",
// 			metadata: { profileId: profile._id },
// 			ipAddress: req.ip,
// 		});

// 		res.status(200).json({
// 			success: true,
// 			message: "Profile updated successfully",
// 			profile: {
// 				...profile._doc,
// 				panEncrypted: undefined,
// 				aadhaarEncrypted: undefined,
// 			},
// 		});
// 	} catch (error) {
// 		console.log("Error in updateMyEmployeeProfile ", error);
// 		res.status(500).json({ success: false, message: error.message });
// 	}
// };




export const updateEmployeeProfile = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      pan,
      aadhaar,
      address,
      emergencyContact,
      dateOfJoining,
      dateOfBirth,
    } = req.body;

    let profile = await EmployeeProfile.findOne({ userId: req.userId });

    if (!profile) {
      profile = new EmployeeProfile({
        userId: req.userId,
        organizationId: req.user.organizationId,
      });
    }

    // Update fields (only if provided)
    if (fullName !== undefined) profile.fullName = fullName;
    if (phone !== undefined) profile.phone = phone;
    if (address !== undefined) profile.address = address;
    if (emergencyContact !== undefined) profile.emergencyContact = emergencyContact;
    if (dateOfJoining !== undefined) profile.dateOfJoining = dateOfJoining;
    if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;

    // Encrypt sensitive fields
    if (pan) profile.panEncrypted = encrypt(pan);
    if (aadhaar) profile.aadhaarEncrypted = encrypt(aadhaar);

    // 🔥 SINGLE SOURCE OF TRUTH FOR COMPLETION
    const completion = calculateEmployeeProfileCompletion(profile);

    profile.profileCompletionPercent = completion.percent;
    profile.completedSections = completion.completedSections;
    profile.profileCompleted = completion.isCompleted;

    await profile.save();

    await AuditLog.create({
      organizationId: profile.organizationId,
      userId: req.userId,
      action: "PROFILE_UPDATED",
      metadata: {
        profileId: profile._id,
        completionPercent: completion.percent,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        ...profile.toObject(),
        panEncrypted: undefined,
        aadhaarEncrypted: undefined,
      },
    });
  } catch (error) {
    console.log("Error in updateMyEmployeeProfile", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.body;

    // Ensure user belongs to same org
    const user = await User.findOne({
      _id: userId,
      organizationId: organizationId,
    }).select("_id");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this organization",
      });
    }

    const profile = await EmployeeProfile.findOne({ userId }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // console.log("Fetched profile: ", profile);

    const completion = calculateEmployeeProfileCompletion(profile);

    // Remove sensitive fields entirely
    delete profile.panEncrypted;
    delete profile.aadhaarEncrypted;

    res.status(200).json({
      success: true,
      profile,
      completion,
      profileCompletion: {
        percent: completion.profileCompletionPercent,
        completedSections: completion.completedSections,
        completed: completion.profileCompleted,
      },
    });
  } catch (error) {
    console.log("Error in getEmployeeProfile", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

