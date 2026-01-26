// Counter model
import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
});

export default mongoose.model("Counter", CounterSchema);
