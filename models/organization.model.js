import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },

    workingHours: {
      start: { type: String }, // "09:00"
      end: { type: String },   // "18:00"
    },

    attendancePolicy: {
      minHoursPerDay: { type: Number, default: 8 },
      lateGraceMinutes: { type: Number, default: 10 },
      allowRemote: { type: Boolean, default: true },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Organization = mongoose.model("Organization", OrganizationSchema);

export default Organization;