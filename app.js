// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import path from "path";

// import { connectDB } from "./db/connectDB.js";
// import { autoCheckoutCronJob } from "./cronJobs/Attendence.js";

// import authRoutes from "./routes/auth.route.js";
// import organizationRoutes from "./routes/organization.route.js";
// import invitationRoutes from "./routes/invitation.route.js";
// import userRoutes from "./routes/user.route.js";
// import profileRoutes from "./routes/profile.route.js";
// import attendanceRoutes from "./routes/attendance.route.js";
// import reportRoutes from "./routes/report.route.js";
// import auditRoutes from "./routes/audit.route.js";
// import tokenRoutes from "./routes/token.route.js";
// import healthRoutes from "./routes/health.route.js";
// import leaveRoutes from "./routes/leave.route.js";
// import payrollRoutes from "./routes/payroll.route.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;
// const __dirname = path.resolve();

// app.use(cors({ origin: [process.env.FRONTEND_ORIGIN], credentials: true }));
// // app.use(cors({ origin: "*", credentials: true }));

// app.use(express.json()); // allows us to parse incoming requests:req.body
// app.use(cookieParser()); // allows us to parse incoming cookies

// app.use("/api/auth", authRoutes);
// app.use("/api/organizations", organizationRoutes);
// app.use("/api/invitations", invitationRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/profile", profileRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/reports", reportRoutes);
// app.use("/api/audit-logs", auditRoutes);
// app.use("/api/tokens", tokenRoutes);
// app.use("/api/health", healthRoutes);
// app.use("/api/leave", leaveRoutes);
// app.use("/api/payroll", payrollRoutes);


// export default async function handler(req, res) {
//   await connectDB();      // runs per cold start
//   return app(req, res);   // hand over to Express
// }

// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

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

app.use(cors({ origin: [process.env.FRONTEND_ORIGIN], credentials: true }));
app.use(express.json());
app.use(cookieParser());

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

export default app;
