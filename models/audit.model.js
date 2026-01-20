import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
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
    },

    action: { 
      type: String,
      enum: [
        "INVITATION_SENT",
        "INVITATION_ACCEPTED",
        "USER_ACTIVATED",
        "USER_DEACTIVATED",
        "USER_CREATED",
        "USER_DELETED",
        "PASSWORD_CHANGED",
        "LOGIN_SUCCESS",
        "LOGIN_FAILURE",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "PERMISSION_CHANGED",
        "CHECK_IN",
        "CHECK_OUT"
      ],
      required: true }, // e.g. "CHECK_IN"
    metadata: { type: mongoose.Schema.Types.Mixed },

    ipAddress: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
