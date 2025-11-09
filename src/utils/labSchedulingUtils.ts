export interface LabResource {
  id: string;
  name: string;
  capacity: number;
  type: "lab" | "classroom";
  subjects: string[]; // Subjects that can use this lab
}

export interface LabSchedule {
  [day: string]: {
    [period: number]: {
      labId: string;
      className: string;
      subject: string;
      studentsCount: number;
    } | null;
  };
}

export interface ClassCapacityInfo {
  className: string;
  studentsCount: number;
}

// Create empty lab schedule for all labs
export function createEmptyLabSchedule(
  labResources: LabResource[],
  days: string[],
  periodsPerDay: number
): LabSchedule {
  const schedule: LabSchedule = {};
  
  days.forEach(day => {
    schedule[day] = {};
    for (let period = 1; period <= periodsPerDay; period++) {
      schedule[day][period] = null;
    }
  });
  
  return schedule;
}

// Check if a lab is available for a specific time slot
export function isLabAvailable(
  labSchedule: LabSchedule,
  labId: string,
  day: string,
  period: number
): boolean {
  // Check if this specific lab is free at this time
  const assignment = labSchedule[day]?.[period];
  return !assignment || assignment.labId !== labId;
}

// Check if ANY lab with a specific name is available (to prevent same-named lab collisions)
export function isLabNameAvailable(
  labSchedule: LabSchedule,
  labResources: LabResource[],
  labName: string,
  day: string,
  period: number
): boolean {
  const assignment = labSchedule[day]?.[period];
  if (!assignment) return true;
  
  // Check if the assigned lab has the same name
  const assignedLab = labResources.find(lab => lab.id === assignment.labId);
  return !assignedLab || assignedLab.name.toLowerCase() !== labName.toLowerCase();
}

// Check if multiple consecutive periods are available for a lab
export function areConsecutivePeriodsAvailable(
  labSchedule: LabSchedule,
  labId: string,
  day: string,
  startPeriod: number,
  periodsNeeded: number
): boolean {
  for (let i = 0; i < periodsNeeded; i++) {
    const period = startPeriod + i;
    if (!isLabAvailable(labSchedule, labId, day, period)) {
      return false;
    }
  }
  return true;
}

// Find available labs for a subject
export function findAvailableLabsForSubject(
  labResources: LabResource[],
  subject: string,
  className: string,
  studentsCount: number
): LabResource[] {
  return labResources.filter(lab => {
    // Check if lab supports this subject
    const supportsSubject = lab.subjects.includes(subject) || lab.subjects.length === 0;
    
    // Check if lab has enough capacity
    const hasCapacity = lab.capacity >= studentsCount;
    
    return supportsSubject && hasCapacity;
  });
}

// Assign a lab for specific time slots
export function assignLabPeriods(
  labSchedule: LabSchedule,
  labId: string,
  day: string,
  startPeriod: number,
  periodsNeeded: number,
  className: string,
  subject: string,
  studentsCount: number
): boolean {
  // Check if all periods are available
  if (!areConsecutivePeriodsAvailable(labSchedule, labId, day, startPeriod, periodsNeeded)) {
    return false;
  }
  
  // Assign all periods
  for (let i = 0; i < periodsNeeded; i++) {
    const period = startPeriod + i;
    if (!labSchedule[day]) {
      labSchedule[day] = {};
    }
    labSchedule[day][period] = {
      labId,
      className,
      subject,
      studentsCount,
    };
  }
  
  return true;
}

// Get lab utilization statistics
export function getLabUtilization(
  labSchedule: LabSchedule,
  labResources: LabResource[],
  days: string[],
  periodsPerDay: number
): { labId: string; labName: string; utilizationPercentage: number; totalSlots: number; occupiedSlots: number }[] {
  const stats = labResources.map(lab => {
    const totalSlots = days.length * periodsPerDay;
    let occupiedSlots = 0;
    
    days.forEach(day => {
      for (let period = 1; period <= periodsPerDay; period++) {
        const assignment = labSchedule[day]?.[period];
        if (assignment && assignment.labId === lab.id) {
          occupiedSlots++;
        }
      }
    });
    
    return {
      labId: lab.id,
      labName: lab.name,
      utilizationPercentage: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
      totalSlots,
      occupiedSlots,
    };
  });
  
  return stats;
}

// Validate class capacity against available labs
export function validateClassCapacities(
  classCapacities: ClassCapacityInfo[],
  labResources: LabResource[],
  subjectLabAssignments: Record<string, string[]> // subject -> lab subjects
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;
  
  classCapacities.forEach(classInfo => {
    // Check if any lab subjects exist for this class
    const hasLabSubjects = Object.keys(subjectLabAssignments).some(subject =>
      subject.toLowerCase().includes('lab')
    );
    
    if (hasLabSubjects) {
      // Find the largest lab capacity
      const maxLabCapacity = Math.max(...labResources.map(lab => lab.capacity));
      
      if (classInfo.studentsCount > maxLabCapacity) {
        errors.push(
          `Class ${classInfo.className} has ${classInfo.studentsCount} students, ` +
          `but the largest lab capacity is ${maxLabCapacity}. Some students won't fit.`
        );
        isValid = false;
      } else if (classInfo.studentsCount > maxLabCapacity * 0.8) {
        warnings.push(
          `Class ${classInfo.className} has ${classInfo.studentsCount} students, ` +
          `which is close to the maximum lab capacity of ${maxLabCapacity}. Consider dividing the class.`
        );
      }
    }
  });
  
  return { isValid, errors, warnings };
}

// Check for lab scheduling conflicts
export function validateLabSchedule(
  labSchedule: LabSchedule,
  labResources: LabResource[]
): { isValid: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  let isValid = true;
  
  // Check for double bookings (shouldn't happen with proper scheduling, but good to validate)
  Object.entries(labSchedule).forEach(([day, daySchedule]) => {
    Object.entries(daySchedule).forEach(([period, assignment]) => {
      if (assignment) {
        const lab = labResources.find(l => l.id === assignment.labId);
        if (!lab) {
          conflicts.push(`Unknown lab ${assignment.labId} assigned on ${day} period ${period}`);
          isValid = false;
        } else if (assignment.studentsCount > lab.capacity) {
          conflicts.push(
            `${assignment.className} (${assignment.studentsCount} students) exceeds ` +
            `capacity of ${lab.name} (${lab.capacity}) on ${day} period ${period}`
          );
          isValid = false;
        }
      }
    });
  });
  
  return { isValid, conflicts };
}