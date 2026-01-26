import bcryptjs from "bcryptjs";
import crypto from "crypto";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../nodemailer/email.service.js";
import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import Organization from "../models/organization.model.js";
import EmployeeProfile from "../models/employee.model.js";
import mongoose from "mongoose";
import { generateEmployeeId } from "../utils/generateEmployeeId.js";


export const signup = async (req, res) => {
  const { email, password, organizationName, role, firstName, lastName } = req.body;

  if (!email || !password || !organizationName || !role || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ❗ DB-level uniqueness must exist on email
    const hashedPassword = await bcryptjs.hash(password, 10);

    const organization = await Organization.create(
      [{ name: organizationName }],
      { session }
    );

    const user = await User.create(
      [
        {
          email,
		  name: firstName + " " + lastName,
          passwordHash: hashedPassword,
          organizationId: organization[0]._id,
          role,
        },
      ],
      { session }
    );

    const employeeProfile = await EmployeeProfile.create(
      [
        {
          userId: user[0]._id,
		  fullName: firstName + " " + lastName,
          employeeId: await generateEmployeeId(organization[0]._id), // ideally org-scoped
          organizationId: organization[0]._id,
        },
      ],
      { session }
    );

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await Token.create(
      [
        {
          userId: user[0]._id,
          token: verificationToken,
          tokenType: "EMAIL_VERIFICATION",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      ],
      { session }
    );

    // ✅ Commit DB changes
    await session.commitTransaction();
    session.endSession();

    // 🔐 Auth & email should happen AFTER commit
    generateTokenAndSetCookie(res, user[0]._id, user[0]); 

    // async / queue later
    await sendVerificationEmail(user[0].email, verificationToken);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        _id: user[0]._id,
        email: user[0].email,
        role: user[0].role,
        organizationId: user[0].organizationId,
        isVerified: user[0].isVerified,
        isActive: user[0].isActive,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Duplicate email (DB unique index)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
};


export const verifyEmail = async (req, res) => {
	const { code, userId } = req.body;
	// const userId = req.userId;
	console.log("verifyEmail called with code: ", code, " userId: ", userId);
	try {
		// Find valid token
		const tokenRecord = await Token.findOne({
			token: code,
			userId: userId,
			tokenType: "EMAIL_VERIFICATION",
			isUsed: false,
			expiresAt: { $gt: Date.now() },
		});
		console.log("tokenRecord: ", tokenRecord);
		if (!tokenRecord) {
			return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
		}

		// Find user
		const user = await User.findById(tokenRecord.userId);
		
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Update user verification status
		user.isVerified = true;
		await user.save();

		// Mark token as used
		tokenRecord.isUsed = true;
		await tokenRecord.save();

		await sendWelcomeEmail(user.email, user.email);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				role: user.role,
				organizationId: user.organizationId,
				isVerified: user.isVerified,
				isActive: user.isActive,
			},
		});
	} catch (error) {
		console.log("error in verifyEmail ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

export const login = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
		if (!isPasswordValid) {
			return res.status(400).json({ success: false, message: "Invalid credentials" });
		}
		
		await generateTokenAndSetCookie(res, user._id, user);

		user.lastLoginAt = new Date();
		await user.save();

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			user: {
				_id: user._id,
				email: user.email,
				name: user.name,
				role: user.role,
				organizationId: user.organizationId,
				isVerified: user.isVerified,
				isActive: user.isActive,
			},
		});
	} catch (error) {
		console.log("Error in login ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const logout = async (req, res) => {
	res.clearCookie("accessToken");
	res.clearCookie("refreshToken");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const refreshToken = async (req, res) => {
	try {
		const { refreshToken } = req.cookies;

		if (!refreshToken) {
			return res.status(401).json({ success: false, message: "Refresh token not provided" });
		}

		// Find valid refresh token
		const tokenRecord = await Token.findOne({
			token: refreshToken,
			tokenType: "REFRESH_TOKEN",
			isUsed: false,
			expiresAt: { $gt: Date.now() },
		});

		if (!tokenRecord) {
			return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
		}

		// Mark old token as used
		tokenRecord.isUsed = true;
		await tokenRecord.save();

		const user = await User.findById(tokenRecord.userId);
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate new tokens
		await generateTokenAndSetCookie(res, tokenRecord.userId, user);

		res.status(200).json({ success: true, message: "Token refreshed successfully" });
	} catch (error) {
		console.log("Error in refreshToken ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

export const revokeAllTokens = async (req, res) => {
	try {
		const userId = req.userId;

		// Mark all refresh tokens as used
		await Token.updateMany(
			{ userId, tokenType: "REFRESH_TOKEN", isUsed: false },
			{ isUsed: true }
		);

		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");

		res.status(200).json({ success: true, message: "Logged out from all devices" });
	} catch (error) {
		console.log("Error in revokeAllTokens ", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");

		// Create token record
		await Token.create({
			userId: user._id,
			token: resetToken,
			tokenType: "PASSWORD_RESET",
			expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
		});

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		// Find valid token
		const tokenRecord = await Token.findOne({
			token: token,
			tokenType: "PASSWORD_RESET",
			isUsed: false,
			expiresAt: { $gt: Date.now() },
		});

		if (!tokenRecord) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// Find user
		const user = await User.findById(tokenRecord.userId);

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Update password
		const hashedPassword = await bcryptjs.hash(password, 10);
		user.passwordHash = hashedPassword;
		await user.save();

		// Mark token as used
		tokenRecord.isUsed = true;
		await tokenRecord.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.userId).select("-passwordHash");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};