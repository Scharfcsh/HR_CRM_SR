import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    email: { type: String, required: true, lowercase: true },

    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      required: true,
    },

    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },

    accepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InvitationSchema.index({ token: 1, expiresAt: 1 });

export default mongoose.model("Invitation", InvitationSchema);
