export const EMPLOYEE_PROFILE_COMPLETION_RULES = {
  basicInfo: ["fullName", "dateOfBirth", "address", "phone", "email"],

  identityInfo: ["panEncrypted", "aadhaarEncrypted"],

  workInfo: ["dateOfJoining", "employeeId", "department", "position"],
};


export function calculateEmployeeProfileCompletion(profile) {
  const completedSections = [];
  const totalSections = Object.keys(EMPLOYEE_PROFILE_COMPLETION_RULES).length;

  for (const [section, fields] of Object.entries(
    EMPLOYEE_PROFILE_COMPLETION_RULES
  )) {
    const isSectionComplete = fields.every((path) => {
      return path.split(".").reduce((obj, key) => obj?.[key], profile);
    });

    if (isSectionComplete) {
      completedSections.push(section);
    }
  }

  const percent = Math.round(
    (completedSections.length / totalSections) * 100
  );

  return {
    percent,
    completedSections,
    isCompleted: percent === 100,
  };
}
