import mongoose from "mongoose";

const LeaveBalanceSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType" },

  year: { type: Number, required: true },

  used: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0, required: true }
});

LeaveBalanceSchema.index({ userId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

export default mongoose.model("LeaveBalance", LeaveBalanceSchema);
