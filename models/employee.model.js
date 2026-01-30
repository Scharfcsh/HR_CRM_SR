import mongoose from "mongoose";

const EmployeeProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    employeeId: { type: String,required: true, index: true },
    position: { type: String },
    department: { type: String },

    fullName: { type: String},
    phone: { type: String },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },

    dateOfBirth: { type: Date },

    // PAN and Aadhaar should be stored in a s3 bucket and it endpoint will be save here

    panEncrypted: { type: String },
    aadhaarEncrypted: { type: String },

    address: { type: String },

    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },

    dateOfJoining: { type: Date },
    profileCompleted: { type: Boolean, default: false },
    profileCompletionPercent: { type: Number, default: 0 },
    completedSections: { type: [String], default: [] },
  },
  { timestamps: true }
);


const EmployeeProfile = mongoose.model("EmployeeProfile", EmployeeProfileSchema);

export default EmployeeProfile;