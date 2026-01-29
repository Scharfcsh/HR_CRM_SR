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
        "CHECK_OUT",
        "PROFILE_UPDATED",
        "ORGANIZATION_SETTINGS_UPDATED",
        "NOTIFICATION_PREFERENCES_UPDATED",
        "LEAVE_POLICY_UPDATED",
        "ATTENDANCE_POLICY_UPDATED",
        "WORKING_HOURS_UPDATED",
        "ORGANIZATION_INFO_UPDATED",
        "CREATE_LEAVE_REQUEST",
        "APPROVE_LEAVE_REQUEST",
        "PAYROLL_GENERATED",
        "SALARY_STRUCTURE_UPDATED"
      ],
      required: true,
    }, // e.g. "CHECK_IN"
    metadata: { type: mongoose.Schema.Types.Mixed },

    ipAddress: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("AuditLog", AuditLogSchema);
