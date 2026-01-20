import jwt from "jsonwebtoken";
import Token from "../models/token.model.js";
import crypto from "crypto";

export const generateTokenAndSetCookie = async (res, userId) => {
	// Generate access token (short-lived)
	const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: "15m", // 15 minutes
	});

	// Generate refresh token (long-lived)
	const refreshToken = crypto.randomBytes(40).toString("hex");

	// Store refresh token in database
	await Token.create({
		userId,
		token: refreshToken,
		tokenType: "REFRESH_TOKEN",
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
	});

	// Set access token as httpOnly cookie
	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 15 * 60 * 1000, // 15 minutes
	});

	// Set refresh token as httpOnly cookie
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	return { accessToken, refreshToken }
};