// Counter model
import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  value: { type: Number, default: 0 },
}, { timestamps: true });

// Compound unique index: each organization can have its own counter for each name
CounterSchema.index({ orgId: 1 }, { unique: true });

export default mongoose.model("Counter", CounterSchema);
