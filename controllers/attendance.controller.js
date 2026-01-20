import Attendance from "../models/attendance.model.js";
import AuditLog from "../models/audit.model.js";
import User from "../models/user.model.js";

export const checkIn = async (req, res) => {
	try {
		// Check for existing open session
		// console.log("req.userId", req.user);
		const existingSession = await Attendance.findOne({
			userId: req.userId,
			checkOut: null,
		});

		if (existingSession) {
			return res.status(400).json({ success: false, message: "Already checked in. Please check out first." });
		}
		const user = await User.findById(req.userId);
		

		const attendance = await Attendance.create({
			organizationId: user.organizationId,
			userId: req.userId,
			checkIn: new Date(),
			status: "PRESENT",
			ipAddress: req.ip,
			deviceInfo: req.headers["user-agent"],
		});

		await AuditLog.create({
			organizationId: user.organizationId,
			userId: req.userId,
			action: "CHECK_IN",
			metadata: { attendanceId: attendance._id },
			ipAddress: req.ip,
		});

		res.status(201).json({
			success: true,
			message: "Checked in successfully",
			attendance,
		});
	} catch (error) {
		console.log("Error in checkIn ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const checkOut = async (req, res) => {
	try {
		const attendance = await Attendance.findOne({
			userId: req.userId,
			checkOut: null,
		});

		if (!attendance) {
			return res.status(400).json({ success: false, message: "No open check-in session found" });
		}
		const user = await User.findById(req.userId);

		attendance.checkOut = new Date();
		
		const duration = Math.floor((attendance.checkOut - attendance.checkIn) / 1000 / 60); // minutes

		// less than 5 hours
		//TODO: Make working hours configurable per organization
		if(duration < 300) {
			attendance.status = "ABSENT";
		}else if(duration >= 300 && duration < 420){
			attendance.status = "HALF_DAY";
		}
		else{
			attendance.status = "PRESENT";
		}

		await attendance.save();

		await AuditLog.create({
			organizationId: user.organizationId,
			userId: req.userId,
			action: "CHECK_OUT",
			metadata: { attendanceId: attendance._id },
			ipAddress: req.ip,
		});

		// Calculate duration
		

		res.status(200).json({
			success: true,
			message: "Checked out successfully",
			attendance,
			duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
		});
	} catch (error) {
		console.log("Error in checkOut ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getMyAttendance = async (req, res) => {
	try {
		const { startDate, endDate, page = 1, limit = 10 } = req.query;

		const filter = { userId: req.userId };

		if (startDate || endDate) {
			filter.checkIn = {};
			if (startDate) filter.checkIn.$gte = new Date(startDate);
			if (endDate) filter.checkIn.$lte = new Date(endDate);
		}

		const attendance = await Attendance.find(filter)
			.sort({ checkIn: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const count = await Attendance.countDocuments(filter);

		res.status(200).json({
			success: true,
			attendance,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
			total: count,
		});
	} catch (error) {
		console.log("Error in getMyAttendance ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const getAllAttendance = async (req, res) => {
	try {
		const { userId, startDate, endDate, page = 1, limit = 10 } = req.query;

		const filter = { organizationId: req.user.organizationId };

		if (userId) {
			filter.userId = userId;
		}

		if (startDate || endDate) {
			filter.checkIn = {};
			if (startDate) filter.checkIn.$gte = new Date(startDate);
			if (endDate) filter.checkIn.$lte = new Date(endDate);
		}

		const attendance = await Attendance.find(filter)
			.populate("userId", "email role")
			.sort({ checkIn: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit);

		const count = await Attendance.countDocuments(filter);

		res.status(200).json({
			success: true,
			attendance,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
			total: count,
		});
	} catch (error) {
		console.log("Error in getAllAttendance ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};


//TODO: Need to implement proper indentation and pagination logic
export const getAttendanceById = async (req, res) => {
	try {
		const { id } = req.params;

		const attendance = await Attendance.findOne({
			_id: id,
			organizationId: req.user.organizationId,
		}).populate("userId", "email role");

		if (!attendance) {
			return res.status(404).json({ success: false, message: "Attendance record not found" });
		}

		res.status(200).json({
			success: true,
			attendance,
		});
	} catch (error) {
		console.log("Error in getAttendanceById ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const updateAttendance = async (req, res) => {
	try {
		const { id } = req.params;
		const { checkIn, checkOut } = req.body;

		const attendance = await Attendance.findOne({
			_id: id,
			organizationId: req.user.organizationId,
		});

		if (!attendance) {
			return res.status(404).json({ success: false, message: "Attendance record not found" });
		}

		if (checkIn) {
			attendance.checkIn = new Date(checkIn);
		}

		if (checkOut) {
			attendance.checkOut = new Date(checkOut);
		}

		attendance.isManualEdit = true;
		await attendance.save();

		await AuditLog.create({
			organizationId: req.user.organizationId,
			userId: req.userId,
			action: "ATTENDANCE_EDITED",
			metadata: { 
				attendanceId: attendance._id,
				targetUserId: attendance.userId,
				checkIn: attendance.checkIn,
				checkOut: attendance.checkOut,
			},
			ipAddress: req.ip,
		});

		res.status(200).json({
			success: true,
			message: "Attendance updated successfully",
			attendance,
		});
	} catch (error) {
		console.log("Error in updateAttendance ", error);
		res.status(500).json({ success: false, message: error.message });
	}
};



export const getTodaysAttendanceCount = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Attendance.aggregate([
      {
        $match: {
          organizationId: req.user.organizationId,
          checkIn: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);


    // Normalize output (important for frontend sanity)
    const counts = {
      PRESENT: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
      HALF_DAY: 0,
    };

    result.forEach(item => {
      counts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      todaysAttendanceCount: counts,
    });
  } catch (error) {
    console.error("Error in getTodaysAttendanceCount", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

