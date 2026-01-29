import mongoose from "mongoose";

// This stores the base salary structure for each employee
const SalaryStructureSchema = new mongoose.Schema(
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
      unique: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeProfile",
      required: true,
    },

    // Base Salary
    grossSalary: { type: Number, required: true },

    // Salary Breakdown (percentages are standard but amounts are stored)
    basicSalary: { type: Number, required: true }, // 40% of gross
    hra: { type: Number, required: true }, // 16% of gross
    otherAllowances: { type: Number, required: true }, // 44% of gross

    // Bank Details
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },

    // Effective Date
    effectiveFrom: { type: Date, default: Date.now },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Static method to calculate salary breakdown from gross
SalaryStructureSchema.statics.calculateBreakdown = function (grossSalary) {
  const basicSalary = Math.round(grossSalary * 0.4 * 100) / 100; // 40%
  const hra = Math.round(grossSalary * 0.16 * 100) / 100; // 16%
  const otherAllowances = Math.round((grossSalary - basicSalary - hra) * 100) / 100; // Remaining 44%

  return {
    grossSalary,
    basicSalary,
    hra,
    otherAllowances,
    perDaySalary: Math.round((grossSalary / 30) * 100) / 100,
  };
};

export default mongoose.model("SalaryStructure", SalaryStructureSchema);
