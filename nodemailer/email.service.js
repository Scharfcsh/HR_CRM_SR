import {
	PASSWORD_RESET_REQUEST_TEMPLATE,
	PASSWORD_RESET_SUCCESS_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE,
	INVITATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
import { transporter } from "./nodemailer.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
	try {
		const info = await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: "Verify your email",
			html: VERIFICATION_EMAIL_TEMPLATE(verificationToken),
		});

		console.log("Email sent successfully", info.messageId);
	} catch (error) {
		console.error(`Error sending verification`, error);

		throw new Error(`Error sending verification email: ${error}`);
	}
};

export const sendWelcomeEmail = async (email, name) => {
	try {
		
		
		const info = await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: "Welcome to Auth Company",
			html: WELCOME_EMAIL_TEMPLATE(name),
		});

		console.log("Welcome email sent successfully", info.messageId);
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`);
	}
};

export const sendPasswordResetEmail = async (email, resetURL) => {
	try {
		
		
		const info = await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE(resetURL),
		});

		console.log("Password reset email sent successfully", info.messageId);
	} catch (error) {
		console.error(`Error sending password reset email`, error);

		throw new Error(`Error sending password reset email: ${error}`);
	}
};

export const sendResetSuccessEmail = async (email) => {
	try {
		const info = await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,
		});

		console.log("Password reset success email sent successfully", info.messageId);
	} catch (error) {
		console.error(`Error sending password reset success email`, error);

		throw new Error(`Error sending password reset success email: ${error}`);
	}
};

export const sendInvitationEmail = async (email, token) => {
	try {
		const inviteURL = `${process.env.FRONTEND_ORIGIN}/auth/invitation?token=${token}`;
		
		const info = await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: "You're Invited to Join Our Organization",
			html: INVITATION_EMAIL_TEMPLATE(inviteURL),
		});

		console.log("Invitation email sent successfully", info.messageId);
	} catch (error) {
		console.error(`Error sending invitation email`, error);

		throw new Error(`Error sending invitation email: ${error}`);
	}
};


// function testMail() {
//     const email = "amanadhikari2003@gmail.com"
//     sendPasswordResetEmail(email, "http://example.com/reset-password");
//     sendResetSuccessEmail(email);
//     sendVerificationEmail(email, "sample-verification-token");
//     sendWelcomeEmail(email, "Aman Adhikari");
// }

// // Uncomment the line below to run the test function
// testMail();