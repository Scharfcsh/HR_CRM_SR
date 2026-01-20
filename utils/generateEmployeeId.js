import counterModel from "../models/counter.model.js";

export async function generateEmployeeId() {
  const counter = await counterModel.findOneAndUpdate(
    { name: "employeeId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `EMP-${String(counter.value).padStart(6, "0")}`;
}
