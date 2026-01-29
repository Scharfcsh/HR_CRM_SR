import cron from "node-cron";
import Attendance from "../models/attendance.model.js";
import AuditLog from "../models/audit.model.js";

/**
 * Auto checkout cron job
 * Runs every day at 1:00 AM
 * Finds all attendance records from the previous day that don't have a checkout time
 * and automatically checks them out at 11:59 PM of that day
 */
export const autoCheckoutCronJob = () => {
  // Run at 1:00 AM every day
  cron.schedule("0 1 * * *", async () => {
    console.log("[CRON] Running auto-checkout job at", new Date().toISOString());

    try {
      // Get yesterday's date range
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Find all attendance records from yesterday without checkout
      const uncheckedAttendances = await Attendance.find({
        date: {
          $gte: yesterday,
          $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        },
        checkOut: null,
      });

      console.log(`[CRON] Found ${uncheckedAttendances.length} employees without checkout`);

      for (const attendance of uncheckedAttendances) {
        // Set checkout time to 11:59 PM of the check-in day
        const autoCheckoutTime = new Date(attendance.date);
        autoCheckoutTime.setHours(23, 59, 59, 999);

        attendance.checkOut = autoCheckoutTime;

        // Calculate duration in minutes
        const duration = Math.floor(
          (attendance.checkOut - attendance.checkIn) / 1000 / 60
        );

        // Update status based on duration
        if (duration < 300) {
          attendance.status = "ABSENT";
        } else if (duration >= 300 && duration < 420) {
          attendance.status = "HALF_DAY";
        } else {
          attendance.status = "PRESENT";
        }

        attendance.isManualEdit = true; // Mark as auto-edited
        await attendance.save();

        // Create audit log for auto checkout
        await AuditLog.create({
          organizationId: attendance.organizationId,
          userId: attendance.userId,
          action: "AUTO_CHECK_OUT",
          metadata: {
            attendanceId: attendance._id,
            reason: "Automatic checkout by system - employee forgot to check out",
            autoCheckoutTime: autoCheckoutTime,
            calculatedDuration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
          },
        });

        console.log(
          `[CRON] Auto checked out user ${attendance.userId} for date ${attendance.date.toDateString()}`
        );
      }

      console.log(`[CRON] Auto-checkout job completed. Processed ${uncheckedAttendances.length} records.`);
    } catch (error) {
      console.error("[CRON] Error in auto-checkout job:", error);
    }
  });

  console.log("[CRON] Auto-checkout cron job scheduled to run at 1:00 AM daily");
};
