import mongoose from "mongoose";

const LeaveTypeSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  name: { type: String, required: true }, // Sick Leave
  category: {
    type: String,
    enum: ["PERSONAL", "ANNUAL", "MEDICAL", "EARNED"],
    required: true
  },

  isPaid: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: true },
  autoApprove: { type: Boolean, default: false },

  maxPerYear: { type: Number, default: null }, // null = unlimited
//   carryForward: { type: Boolean, default: false },

}, { timestamps: true });

const LeaveType = mongoose.model("LeaveType", LeaveTypeSchema);

export default LeaveType;