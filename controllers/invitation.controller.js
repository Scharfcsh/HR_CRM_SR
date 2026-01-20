import crypto from "crypto";
import Invitation from "../models/invite.model.js";
import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendInvitationEmail } from "../nodemailer/email.service.js";
import AuditLog from "../models/audit.model.js";
import { generateEmployeeId } from "../utils/generateEmployeeId.js";
import mongoose from "mongoose";
import EmployeeProfile from "../models/employee.model.js";

export const createInvitation = async (req, res) => {
	try {
		const { email, role } = req.body;

		if (!email || !role) {
			return res.status(400).json({ success: false, message: "Email and role are required" });
		}

		if (!["ADMIN", "EMPLOYEE"].includes(role)) {
			return res.status(400).json({ success: false, message: "Invalid role" });
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ success: false, message: "User already exists" });
		}

		// Check if invitation already exists
		const existingInvitation = await Invitation.findOne({
			email,
			accepted: false,
			expiresAt: { $gt: Date.now() },
		});

		if (existingInvitation) {
			return res.status(400).json({ success: false, message: "Invitation already sent" });
		}

		const token = crypto.randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		const invitation = await Invitation.create({
			organizationId: req.user.organizationId,
			email,
			role,
			token,
			expiresAt,
		});

		// Send invitation email
		//TODO: need to implement async email sending with queue
		await sendInvitationEmail(email, token);

		await AuditLog.create({
			organizationId: req.user.organizationId,
			userId: req.userId,
			action: "INVITATION_SENT",
			metadata: { email, role },
			ipAddress: req.ip,
		});

		res.status(201).json({
			success: true,
			message: "Invitation sent successfully",
			invitation: {
				email: invitation.email,
				role: invitation.role,
				expiresAt: invitation.expiresAt,
			},
		});
	} catch (error) {
		console.log("Error in createInvitation ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const validateInvitation = async (req, res) => {
	try {
		const { token } = req.query;

		if (!token) {
			return res.status(400).json({ success: false, message: "Token is required" });
		}

		const invitation = await Invitation.findOne({
			token,
			accepted: false,
			expiresAt: { $gt: Date.now() },
		}).populate("organizationId", "name");

		if (!invitation) {
			return res.status(400).json({ success: false, message: "Invalid or expired invitation" });
		}

		res.status(200).json({
			success: true,
			invitation: {
				email: invitation.email,
				role: invitation.role,
				organization: invitation.organizationId,
			},
		});
	} catch (error) {
		console.log("Error in validateInvitation ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const acceptInvitation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { token, password, name } = req.body;

    if (!token || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Token, password, and name are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    session.startTransaction();

    // 🔒 Lock invitation
    const invitation = await Invitation.findOneAndUpdate(
      {
        token,
        accepted: false,
        expiresAt: { $gt: new Date() },
      },
      { accepted: true },
      { session, new: true }
    );

    if (!invitation) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation",
      });
    }

    // Ensure user does not already exist
    const existingUser = await User.findOne(
      { email: invitation.email },
      null,
      { session }
    );

    if (existingUser) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await User.create(
      [
        {
          name,
          email: invitation.email,
          passwordHash: hashedPassword,
          organizationId: invitation.organizationId,
          role: invitation.role,
          isVerified: true,
        },
      ],
      { session }
    );

    const employeeId = await generateEmployeeId(invitation.organizationId);

    await EmployeeProfile.create(
      [
        {
          userId: user[0]._id,
          organizationId: invitation.organizationId,
          employeeId,
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          organizationId: invitation.organizationId,
          userId: user[0]._id,
          action: "INVITATION_ACCEPTED",
          metadata: {
            email: invitation.email,
            role: invitation.role,
            employeeId,
          },
          ipAddress: req.ip,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // generateTokenAndSetCookie(res, user[0]._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
    //   user: {
    //     _id: user[0]._id,
    //     email: user[0].email,
    //     name: user[0].name,
    //     role: user[0].role,
    //     organizationId: user[0].organizationId,
    //     isVerified: user[0].isVerified,
    //     isActive: user[0].isActive,
    //   },
    });
  } catch (error) {
    await session.abortTransaction();
    console.log("Error in acceptInvitation", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};


export const listInvitations = async (req, res) => {
	try {
		const { page = 1, limit = 10, status } = req.query;

		const filter = { organizationId: req.user.organizationId };

		if (status === "active") {
			filter.accepted = false;
			filter.expiresAt = { $gt: Date.now() };
		} else if (status === "expired") {
			filter.accepted = false;
			filter.expiresAt = { $lte: Date.now() };
		} else if (status === "accepted") {
			filter.accepted = true;
		}

		const invitations = await Invitation.find(filter)
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const count = await Invitation.countDocuments(filter);

		res.status(200).json({
			success: true,
			invitations,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
			total: count,
		});
	} catch (error) {
		console.log("Error in listInvitations ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const revokeInvitation = async (req, res) => {
	try {
		const { id } = req.params;

		const invitation = await Invitation.findOne({
			_id: id,
			organizationId: req.user.organizationId,
			accepted: false,
		});

		if (!invitation) {
			return res.status(404).json({ success: false, message: "Invitation not found" });
		}

		await Invitation.deleteOne({ _id: id });

		await AuditLog.create({
			organizationId: req.user.organizationId,
			userId: req.userId,
			action: "INVITATION_REVOKED",
			metadata: { email: invitation.email },
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Invitation revoked successfully",
		});
	} catch (error) {
		console.log("Error in revokeInvitation ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getInviteStatusNo = async (req, res) => {
	try {
		const filter = {
			organizationId: req.user.organizationId,
			accepted: false,
			expiresAt: { $gt: Date.now() },
		};

		const count = await Invitation.countDocuments(filter);

		res.status(200).json({
			success: true,
			activeInvitations: count,
		});
	} catch (error) {
		console.log("Error in getInviteStatusNo ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};
