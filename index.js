import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { connectDB } from "./db/connectDB.js";
import { autoCheckoutCronJob } from "./cronJobs/Attendence.js";

import authRoutes from "./routes/auth.route.js";
import organizationRoutes from "./routes/organization.route.js";
import invitationRoutes from "./routes/invitation.route.js";
import userRoutes from "./routes/user.route.js";
import profileRoutes from "./routes/profile.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import reportRoutes from "./routes/report.route.js";
import auditRoutes from "./routes/audit.route.js";
import tokenRoutes from "./routes/token.route.js";
import healthRoutes from "./routes/health.route.js";
import leaveRoutes from "./routes/leave.route.js";
import payrollRoutes from "./routes/payroll.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({ origin: [process.env.FRONTEND_ORIGIN],
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	credentials: true 
}));

const allowedOrigins = [process.env.FRONTEND_ORIGIN];


app.use((req, res, next) => {

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {

    res.header('Access-Control-Allow-Origin', origin);

  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {

    return res.status(200).end();

  }

  next();

});
// app.use(cors({ origin: "*", credentials: true }));

app.use(express.json({limit: '5mb'})); // allows us to parse incoming requests:req.body
app.use(cookieParser()); // allows us to parse incoming cookies

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);

// if (process.env.NODE_ENV === "production") {
// 	app.use(express.static(path.join(__dirname, "/frontend/dist")));

// 	app.get("*", (req, res) => {
// 		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
// 	});
// }

app.listen(PORT, () => {
	connectDB();
	autoCheckoutCronJob(); // Start the auto-checkout cron job
	console.log("Server is running on port: ", PORT);
});