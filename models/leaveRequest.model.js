import mongoose from "mongoose";

const LeaveRequestSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },

    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType" },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    reason: { type: String },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const LeaveRequest = mongoose.model("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;