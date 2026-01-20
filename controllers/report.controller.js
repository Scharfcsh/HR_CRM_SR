import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";

export const getDailyAttendanceReport = async (req, res) => {
	try {
		const { date } = req.query;

		const targetDate = date ? new Date(date) : new Date();
		const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
		const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

		const attendance = await Attendance.find({
			organizationId: req.user.organizationId,
			checkIn: { $gte: startOfDay, $lte: endOfDay },
		}).populate("userId", "email role");

		const totalEmployees = await User.countDocuments({
			organizationId: req.user.organizationId,
			role: "EMPLOYEE",
			isActive: true,
		});

		const present = attendance.length;
		const absent = totalEmployees - present;

		// Calculate average hours
		const completedSessions = attendance.filter((a) => a.checkOut);
		const totalMinutes = completedSessions.reduce((sum, a) => {
			return sum + Math.floor((a.checkOut - a.checkIn) / 1000 / 60);
		}, 0);
		const avgHours = completedSessions.length > 0 ? (totalMinutes / completedSessions.length / 60).toFixed(2) : 0;

		res.status(200).json({
			success: true,
			date: startOfDay.toISOString().split("T")[0],
			summary: {
				totalEmployees,
				present,
				absent,
				avgHours,
			},
			attendance,
		});
	} catch (error) {
		console.log("Error in getDailyAttendanceReport ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getWeeklyAttendanceReport = async (req, res) => {
	try {
		const { startDate } = req.query;

		const start = startDate ? new Date(startDate) : new Date();
		start.setHours(0, 0, 0, 0);
		start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)

		const end = new Date(start);
		end.setDate(end.getDate() + 7);

		const attendance = await Attendance.find({
			organizationId: req.user.organizationId,
			checkIn: { $gte: start, $lt: end },
		}).populate("userId", "email role");

		// Group by date
		const dailyStats = {};
		for (let i = 0; i < 7; i++) {
			const date = new Date(start);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split("T")[0];
			dailyStats[dateStr] = { present: 0, avgHours: 0 };
		}

		attendance.forEach((a) => {
			const dateStr = a.checkIn.toISOString().split("T")[0];
			if (dailyStats[dateStr]) {
				dailyStats[dateStr].present++;
			}
		});

		res.status(200).json({
			success: true,
			weekStart: start.toISOString().split("T")[0],
			weekEnd: end.toISOString().split("T")[0],
			dailyStats,
			totalRecords: attendance.length,
		});
	} catch (error) {
		console.log("Error in getWeeklyAttendanceReport ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getMonthlyAttendanceReport = async (req, res) => {
	try {
		const { month, year } = req.query;

		const targetDate = new Date();
		const targetYear = year ? parseInt(year) : targetDate.getFullYear();
		const targetMonth = month ? parseInt(month) - 1 : targetDate.getMonth();

		const start = new Date(targetYear, targetMonth, 1);
		const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

		const attendance = await Attendance.find({
			organizationId: req.user.organizationId,
			checkIn: { $gte: start, $lte: end },
		}).populate("userId", "email role");

		// Group by user
		const userStats = {};
		attendance.forEach((a) => {
			const userId = a.userId._id.toString();
			if (!userStats[userId]) {
				userStats[userId] = {
					user: a.userId,
					daysPresent: 0,
					totalHours: 0,
				};
			}

			userStats[userId].daysPresent++;

			if (a.checkOut) {
				const hours = (a.checkOut - a.checkIn) / 1000 / 60 / 60;
				userStats[userId].totalHours += hours;
			}
		});

		const stats = Object.values(userStats).map((stat) => ({
			...stat,
			avgHoursPerDay: (stat.totalHours / stat.daysPresent).toFixed(2),
		}));

		res.status(200).json({
			success: true,
			month: targetMonth + 1,
			year: targetYear,
			stats,
		});
	} catch (error) {
		console.log("Error in getMonthlyAttendanceReport ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};
