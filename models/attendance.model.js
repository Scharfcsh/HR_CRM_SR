import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY"],
      default: "ABSENT",
    },

    ipAddress: { type: String },
    deviceInfo: { type: String },

    isManualEdit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent multiple open sessions
AttendanceSchema.index(
  { userId: 1, checkOut: 1 },

  {
    unique: true,
    partialFilterExpression: { checkOut: null },
  }
);

export default mongoose.model("Attendance", AttendanceSchema);
