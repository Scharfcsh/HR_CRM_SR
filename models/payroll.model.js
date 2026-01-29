import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema(
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
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeProfile",
      required: true,
    },

    // Salary Structure
    grossSalary: { type: Number, required: true },
    basicSalary: { type: Number, required: true }, // 40% of gross
    hra: { type: Number, required: true }, // 16% of gross (40% of basic)
    otherAllowances: { type: Number, required: true }, // Remaining amount

    // Additional Components
    reimbursement: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },

    // Deductions
    tdsDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },

    // Computed Fields (will be calculated)
    totalEarnings: { type: Number },
    totalDeductions: { type: Number },
    netSalary: { type: Number },

    // Payslip specific fields
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },

    // Status
    status: {
      type: String,
      enum: ["DRAFT", "PROCESSED", "PAID"],
      default: "DRAFT",
    },

    paidOn: { type: Date },
    paymentMethod: { type: String },
    transactionId: { type: String },

    // Working days info
    workingDays: { type: Number, default: 30 },
    presentDays: { type: Number, default: 30 },
    lopDays: { type: Number, default: 0 }, // Loss of Pay days
  },
  { timestamps: true }
);

// Calculate derived fields before saving
PayrollSchema.pre("save", function () {
  this.totalEarnings =
    this.basicSalary +
    this.hra +
    this.otherAllowances +
    this.reimbursement +
    this.incentives +
    this.arrears;

  this.totalDeductions = this.tdsDeduction + this.otherDeductions;

  // Deduct LOP if applicable
  const perDaySalary = this.grossSalary / 30;
  const lopDeduction = perDaySalary * this.lopDays;

  this.netSalary = this.totalEarnings - this.totalDeductions - lopDeduction;

});

// Unique constraint for one payroll per employee per month
PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model("Payroll", PayrollSchema);
