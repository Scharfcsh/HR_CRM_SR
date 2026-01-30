import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    logoUrl: { type: String },
    // Organization Info
    industry: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String },

    weekOffs: {
      type: [String],
      enum: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
      default: ["SAT", "SUN"],
    },

    workingHours: {
      start: { type: String, default: "09:00" }, // "09:00"
      end: { type: String, default: "18:00" }, // "18:00"
    },

    attendancePolicy: {
      minHoursPerDay: { type: Number, default: 8 },
      lateCheckInTime: { type: String, default: "09:30" }, // Employees checking in after this are marked late
      lateGraceMinutes: { type: Number, default: 10 },
      earlyCheckOutTime: { type: String, default: "17:30" }, // Early departure threshold
      allowRemote: { type: Boolean, default: true },
      requireLocation: { type: Boolean, default: false },
      autoCheckOut: { type: Boolean, default: false },
      autoCheckOutTime: { type: String, default: "23:59" },
    },
    attendancePolicyConfigured: { type: Boolean, default: false },

    leavePolicy: {
      annualLeave: { type: Number, default: 15 },
      sickLeave: { type: Number, default: 12 },
      casualLeave: { type: Number, default: 10 },
      maternityLeave: { type: Number, default: 90 },
      paternityLeave: { type: Number, default: 15 },
      unpaidLeave: { type: Number, default: 30 },
      carryForwardLimit: { type: Number, default: 5 }, // Max leaves that can be carried forward
      allowCarryForward: { type: Boolean, default: true },
      minNoticeDays: { type: Number, default: 3 }, // Min days notice required for leave
      maxConsecutiveDays: { type: Number, default: 15 }, // Max consecutive leave days allowed
    },
    leavePolicyConfigured: { type: Boolean, default: false },

    notificationPreferences: {
      absentAlerts: {
        enabled: { type: Boolean, default: true },
        notifyAdmin: { type: Boolean, default: true },
        notifyManager: { type: Boolean, default: true },
      },
      lateCheckIns: {
        enabled: { type: Boolean, default: true },
        notifyAdmin: { type: Boolean, default: true },
        notifyManager: { type: Boolean, default: true },
        thresholdMinutes: { type: Number, default: 15 }, // Notify after X minutes late
      },
      invitationExpiry: {
        enabled: { type: Boolean, default: true },
        reminderDays: { type: Number, default: 2 }, // Remind X days before expiry
      },
      profileUpdates: {
        enabled: { type: Boolean, default: true },
        alertOnMissingData: { type: Boolean, default: true },
        requiredFields: {
          type: [String],
          default: ["phone", "address", "emergencyContact", "department"],
        },
      },
      leaveRequests: {
        enabled: { type: Boolean, default: true },
        notifyAdmin: { type: Boolean, default: true },
        notifyManager: { type: Boolean, default: true },
      },
      leaveApprovals: {
        enabled: { type: Boolean, default: true },
        notifyEmployee: { type: Boolean, default: true },
      },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Organization = mongoose.model("Organization", OrganizationSchema);

export default Organization;
