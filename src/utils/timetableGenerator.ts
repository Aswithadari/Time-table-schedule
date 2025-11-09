import {
  isSpecialSubject,
  isGamesSubject,
  isFreePeriodSubject,
  isMentorSubject,
  isLibrarySubject,
  isSportsSubject,
  isYogaSubject,
  requiresStrictPeriodPlacement,
  getStrictAllowedPeriods,
  isGamesOrLibrarySubject,
  classNameSorter,
  createEmptyTeacherSchedule,
  isTeacherAvailable,
  assignTeacher,
  TeacherSchedule,
  shuffleArray,
  wouldCreateConsecutivePeriods,
  isStrictPreferredPeriodForSubject,
  generateShortName,
  parseCourseDetails,
} from "./timetableHelpers";
import { 
  LabResource, 
  ClassCapacityInfo, 
  createEmptyLabSchedule, 
  findAvailableLabsForSubject,
  assignLabPeriods,
  validateLabSchedule
} from "../utils/labSchedulingUtils";

// Function to validate that scheduled periods match input configuration
function validatePeriodCounts(classSchedule: { [day: string]: { [period: number]: string } }, expectedSubjects: any[]): { isValid: boolean; errors: string[] } {
  const scheduledCounts: { [subject: string]: number } = {};
  const errors: string[] = [];
  
  // Count scheduled periods for each subject
  Object.values(classSchedule).forEach(daySchedule => {
    Object.values(daySchedule).forEach(subjectName => {
      if (subjectName && subjectName !== "UNFILLED" && subjectName !== "Free") {
        // Remove lab suffix and combined class info for counting
        const cleanSubjectName = subjectName.replace(' (Lab)', '').split(' (')[0];
        scheduledCounts[cleanSubjectName] = (scheduledCounts[cleanSubjectName] || 0) + 1;
      }
    });
  });
  
  console.log("Scheduled period counts:", scheduledCounts);
  
  // Check against expected counts
  let isValid = true;
  expectedSubjects.forEach(subject => {
    const subjectName = subject.code || subject.name;
    const expectedPeriods = subject.periods;
    const actualPeriods = scheduledCounts[subjectName] || 0;
    
    if (actualPeriods !== expectedPeriods) {
      isValid = false;
      errors.push(`Subject "${subjectName}": Expected ${expectedPeriods} periods, got ${actualPeriods}`);
      console.log(`Period mismatch - ${subjectName}: Expected ${expectedPeriods}, Actual ${actualPeriods}`);
    }
  });
  
  return { isValid, errors };
}

// Check if timetable has any unfilled periods
function hasUnfilledPeriods(classSchedule: { [day: string]: { [period: number]: string } }, totalPeriodsPerWeek: number): boolean {
  const filledPeriods = Object.values(classSchedule).reduce((sum, daySchedule) => {
    return sum + Object.values(daySchedule).filter(subject => subject && subject !== "UNFILLED").length;
  }, 0);
  return filledPeriods < totalPeriodsPerWeek;
}

// Store previous generation data for retry logic
interface ClassGenerationData {
  className: string;
  schedule: { [day: string]: { [period: number]: string } };
  attempts: number;
  lastError: string;
  isComplete: boolean;
}

let previousGenerationData: ClassGenerationData[] = [];

// Enhanced function to create subject-teacher mapping with better field handling
function createSubjectTeacherMap(facultyData: any[], className: string): { [subject: string]: string } {
  const subjectTeacherMap: { [subject: string]: string } = {};
  
  console.log(`Creating teacher map for class ${className}`);
  console.log('Faculty data sample:', facultyData.slice(0, 3));
  
  facultyData.forEach(row => {
    // Handle different possible field names for classes
    const classField = row.Classes || row.Class || row.classes || row.class || '';
    const subjectField = row.Subject || row.subject || row.Subjects || row.subjects || '';
    const nameField = row.Name || row.name || row.Teacher || row.teacher || '';
    
    if (!classField || !subjectField || !nameField) {
      return;
    }
    
    // Handle both comma-separated and single class entries
    let classNames: string[] = [];
    if (typeof classField === 'string') {
      if (classField.includes(',')) {
        classNames = classField.split(',').map((c: string) => c.trim()).filter(Boolean);
      } else {
        classNames = [classField.trim()];
      }
    }
    
    if (classNames.includes(className)) {
      const subjectName = subjectField.trim();
      const teacherName = nameField.trim();
      
      // Special handling for library subject with special shortcut
      if (subjectName.toLowerCase().includes('library')) {
        subjectTeacherMap['library'] = teacherName;
      } else {
        subjectTeacherMap[subjectName] = teacherName;
      }
      
      console.log(`Mapped ${subjectName} -> ${teacherName} for class ${className}`);
    }
  });
  
  console.log(`Final teacher map for ${className}:`, subjectTeacherMap);
  return subjectTeacherMap;
}

// Check if assigning a subject would create duplicate on same day
function wouldCreateDuplicateOnSameDay(
  classSchedule: { [day: string]: { [period: number]: string } },
  day: string,
  period: number,
  subjectName: string,
  lunchAfter: number,
  periodsPerDay: number
): boolean {
  // Count existing instances of this subject on the same day
  let countBeforeLunch = 0;
  let countAfterLunch = 0;
  
  for (let p = 1; p <= periodsPerDay; p++) {
    if (p === period) continue; // Skip the period we're checking
    const cellContent = classSchedule[day][p];
    if (cellContent && cellContent.includes(subjectName)) {
      if (p <= lunchAfter) {
        countBeforeLunch++;
      } else {
        countAfterLunch++;
      }
    }
  }
  
  // Check if adding this period would violate duplication rules
  const totalCount = countBeforeLunch + countAfterLunch;
  
  // If total periods for subject > 5, allow one before and one after lunch
  // Otherwise, no duplicates on same day
  if (totalCount >= 1) {
    // Already have one period
    if (period <= lunchAfter) {
      // Trying to add before lunch
      return countBeforeLunch >= 1;
    } else {
      // Trying to add after lunch
      return countAfterLunch >= 1;
    }
  }
  
  return false;
}

// Enhanced lab scheduling function to ensure consecutive periods on same day with strict collision detection
function scheduleLabsConsecutively(
  classSchedule: { [day: string]: { [period: number]: string } },
  labSubjects: any[],
  dayNames: string[],
  periodsPerDay: number,
  teacherSchedule: TeacherSchedule,
  subjectTeacherMap: { [subject: string]: string },
  className: string,
  globalLabSchedule: any,
  labResources: LabResource[],
  classConfig?: any
): { [subject: string]: number } {
  const scheduledCounts: { [subject: string]: number } = {};
  
  for (const lab of labSubjects) {
    const subjectName = lab.code || lab.name;
    const teacherName = subjectTeacherMap[subjectName] || subjectTeacherMap[lab.name] || "DefaultTeacher";
    let periodsPlaced = 0;

    console.log(`Scheduling lab ${subjectName} for ${lab.periods} periods`);

    // Lab subjects need exactly 2 consecutive periods on the same day
    while (periodsPlaced < lab.periods) {
      if (periodsPlaced + 2 > lab.periods) break;
      
      let placed = false;
      const shuffledDays = shuffleArray([...dayNames]);
      
      // Get lunch period for this class config
      const lunchPeriod = classConfig?.lunchAfter || 3;
      
      for (const day of shuffledDays) {
        // Monday restriction: labs cannot be in first period
        const isMonday = day === 'Mon';
        
        // Possible lab start periods:
        // 1. Before lunch (but not period 1 on Monday)
        // 2. After lunch and in last available periods
        const possibleStartPeriods = [];
        
        // Before lunch slots (excluding lunch period itself)
        for (let start = 1; start <= lunchPeriod - 1; start++) {
          if (start + 1 < lunchPeriod) { // Ensure 2 consecutive periods before lunch
            // Skip period 1 on Monday
            if (!(isMonday && start === 1)) {
              possibleStartPeriods.push(start);
            }
          }
        }
        
        // After lunch slots (must be in last periods)
        // If periods per day is 6 and lunch is at 3, then after lunch is 4,5,6
        // Labs after lunch must start at last possible position (e.g., 5-6)
        const afterLunchStart = periodsPerDay - 1; // Last 2 periods
        if (afterLunchStart > lunchPeriod) {
          possibleStartPeriods.push(afterLunchStart);
        }
        
        // Shuffle to avoid always picking the same time slots
        const shuffledStarts = shuffleArray(possibleStartPeriods);

        for (const startPeriod of shuffledStarts) {
          const period1 = startPeriod;
          const period2 = startPeriod + 1;
          
          // Ensure we don't span across lunch
          const spansLunch = (period1 <= lunchPeriod && period2 > lunchPeriod);
          if (spansLunch) continue;
          
          // Check if both consecutive periods are available in class schedule
          const allPeriodsAvailable = 
            !classSchedule[day][period1] && 
            !classSchedule[day][period2] &&
            period2 <= periodsPerDay;

          const teacherAvailable = 
            isTeacherAvailable(teacherSchedule, teacherName, day, period1) &&
            isTeacherAvailable(teacherSchedule, teacherName, day, period2);
          
          // STRICT lab collision detection - check by exact lab name match
          let labAvailable = true;
          let availableLabForSlot: any = null;
          
          if (globalLabSchedule && labResources) {
            // Find labs that support this subject
            const supportingLabs = labResources.filter(labRes => 
              labRes.subjects.includes(subjectName) || labRes.subjects.length === 0
            );
            
            if (supportingLabs.length > 0) {
              // Find a lab that's free for both consecutive periods
              availableLabForSlot = supportingLabs.find(labRes => {
                // Check ALL time slots to ensure this specific lab (by exact name) is not occupied
                for (const checkDay of dayNames) {
                  if (!globalLabSchedule[checkDay]) continue;
                  
                  for (let checkPeriod = 1; checkPeriod <= periodsPerDay; checkPeriod++) {
                    const occupied = globalLabSchedule[checkDay][checkPeriod];
                    if (occupied && occupied.labName === labRes.name) {
                      // This lab is occupied somewhere
                      // Check if it's at the time we want
                      if (checkDay === day && (checkPeriod === period1 || checkPeriod === period2)) {
                        return false; // Lab is occupied at our desired time
                      }
                    }
                  }
                }
                return true; // Lab is free at our desired time
              });
              
              labAvailable = !!availableLabForSlot;
              
              if (!labAvailable) {
                console.log(`✗ No available lab for ${subjectName} on ${day} P${period1}-P${period2} - all labs occupied`);
              }
            }
          }
          
          if (allPeriodsAvailable && teacherAvailable && labAvailable) {
            // Schedule both consecutive periods for the lab
            classSchedule[day][period1] = `${subjectName} (Lab)`;
            classSchedule[day][period2] = `${subjectName} (Lab)`;
            
            // Assign teacher for both periods
            assignTeacher(teacherSchedule, teacherName, day, period1, className, subjectName);
            assignTeacher(teacherSchedule, teacherName, day, period2, className, subjectName);
            
            // Mark lab as occupied in global schedule with EXACT lab name for strict collision detection
            if (globalLabSchedule && availableLabForSlot) {
              if (!globalLabSchedule[day]) globalLabSchedule[day] = {};
              globalLabSchedule[day][period1] = { 
                labId: availableLabForSlot.id, 
                labName: availableLabForSlot.name, // Store exact lab name
                className, 
                subject: subjectName, 
                studentsCount: classConfig?.classCapacity || 96 
              };
              globalLabSchedule[day][period2] = { 
                labId: availableLabForSlot.id,
                labName: availableLabForSlot.name, // Store exact lab name
                className, 
                subject: subjectName, 
                studentsCount: classConfig?.classCapacity || 96 
              };
              console.log(`✓ Assigned lab "${availableLabForSlot.name}" for ${className} ${subjectName} on ${day} P${period1}-P${period2}`);
            }
            
            periodsPlaced += 2;
            placed = true;
            console.log(`✓ Scheduled lab ${subjectName} on ${day} periods ${period1}-${period2}`);
            break;
          }
        }
        if (placed) break;
      }
      
      if (!placed) {
        console.log(`✗ Could not schedule 2 consecutive periods for lab ${subjectName}`);
        break;
      }
    }
    
    scheduledCounts[subjectName] = periodsPlaced;
  }
  
  return scheduledCounts;
}

// Enhanced individual class timetable generation with proper period validation
function generateSingleClassTimetable(
  classConfig: any,
  facultyData: any[],
  globalTeacherSchedule: TeacherSchedule,
  combinableSubjects: Map<string, any[]>,
  combinedSubjectSchedule: Map<string, { day: string; period: number }[]>,
  regenerationCount: number = 0,
  labResources?: LabResource[],
  globalLabSchedule?: any
): { success: boolean; schedule: { [day: string]: { [period: number]: string } }; errors: string[]; needsRegeneration: boolean } {
  
  const className = classConfig.name;
  const { workingDays, periodsPerDay, lunchAfter, breakAfter, selectedDays } = classConfig;
  const totalPeriodsPerWeek = workingDays * periodsPerDay;

  console.log(`Generating timetable for class ${className} (regeneration ${regenerationCount})`);

  // Create day labels for this specific class
  const dayMapping = {
    'monday': 'Mon',
    'tuesday': 'Tue', 
    'wednesday': 'Wed',
    'thursday': 'Thu',
    'friday': 'Fri',
    'saturday': 'Sat',
    'sunday': 'Sun'
  };
  
  const dayNames = (selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    .slice(0, workingDays)
    .map(day => dayMapping[day as keyof typeof dayMapping]);

  // Create enhanced subject-teacher mapping for this class
  const subjectTeacherMap = createSubjectTeacherMap(facultyData, className);

  let classSchedule: { [day: string]: { [period: number]: string } } = {};
  let success = false;
  let generationErrors: string[] = [];
  let needsRegeneration = false;
  let maxRetries = 500;
  let retryCount = 0;
  
  // Retry loop for class generation
  while (!success && retryCount < maxRetries) {
    let attemptSchedule: { [day: string]: { [period: number]: string } } = {};
    dayNames.forEach(day => { attemptSchedule[day] = {}; });
    
    // Create a fresh copy of teacher schedule for this attempt
    const tempTeacherSchedule = JSON.parse(JSON.stringify(globalTeacherSchedule));
    let currentAttemptFailures: string[] = [];
    let hasSchedulingError = false;

    try {
      // 1. Apply pre-scheduled combined subjects
      for (const [combineKey, subjects] of combinableSubjects.entries()) {
        const hasCurrentClass = subjects.some(s => s.className === className);
        if (!hasCurrentClass) continue;

        const currentClassSubject = subjects.find(s => s.className === className);
        if (!currentClassSubject) continue;

        const scheduledSlots = combinedSubjectSchedule.get(combineKey);
        if (scheduledSlots) {
          const subjectName = currentClassSubject.code || currentClassSubject.name;
          const teacherName = currentClassSubject.teacher;
          
          scheduledSlots.forEach(slot => {
            if (dayNames.includes(slot.day)) {
              attemptSchedule[slot.day][slot.period] = subjectName;
              if (!tempTeacherSchedule[teacherName][slot.day][slot.period]) {
                tempTeacherSchedule[teacherName][slot.day][slot.period] = [];
              }
              tempTeacherSchedule[teacherName][slot.day][slot.period] = 
                tempTeacherSchedule[teacherName][slot.day][slot.period].filter(a => !a.className.includes('+'));
              tempTeacherSchedule[teacherName][slot.day][slot.period].push({ className, subjectName });
            }
          });
        }
      }

      // 2. Schedule STRICT subjects first (mentor, yoga, sports, library - only 4th and 7th periods)
      const strictSubjects = classConfig.subjects.filter((s: any) => 
        !s.isLab && requiresStrictPeriodPlacement(s.name)
      );
      
      for (const subject of strictSubjects) {
        let subjectName = subject.code || subject.name;
        
        // Handle library subject with special shortcut
        if (subjectName.toLowerCase().includes('library')) {
          subjectName = 'library';
        }
        
        const teacherName = subjectTeacherMap[subjectName] || subjectTeacherMap[subject.name] || "DefaultTeacher";
        const allowedPeriods = getStrictAllowedPeriods(subjectName, periodsPerDay);
        
        console.log(`Scheduling strict subject ${subjectName} to periods: ${allowedPeriods.join(', ')}`);
        
        let periodsPlaced = 0;
        for (let i = 0; i < subject.periods && periodsPlaced < subject.periods; i++) {
          let placed = false;
          
          // Try to place in allowed periods only
          for (const day of shuffleArray([...dayNames])) {
            for (const period of shuffleArray([...allowedPeriods])) {
              if (!attemptSchedule[day][period] && 
                  isTeacherAvailable(tempTeacherSchedule, teacherName, day, period)) {
                attemptSchedule[day][period] = subjectName;
                assignTeacher(tempTeacherSchedule, teacherName, day, period, className, subjectName);
                periodsPlaced++;
                placed = true;
                console.log(`✓ Placed strict subject ${subjectName} on ${day} period ${period}`);
                break;
              }
            }
            if (placed) break;
          }
          
          if (!placed) {
            currentAttemptFailures.push(`Cannot place strict subject "${subjectName}" in allowed periods (${allowedPeriods.join(', ')})`);
            console.log(`✗ Failed to place strict subject ${subjectName}`);
          }
        }
      }

      // 3. Schedule Labs with enhanced consecutive scheduling (2 periods)
      const labSubjects = classConfig.subjects.filter((s: any) => s.isLab);
      const scheduledCounts = scheduleLabsConsecutively(
        attemptSchedule,
        labSubjects,
        dayNames,
        periodsPerDay,
        tempTeacherSchedule,
        subjectTeacherMap,
        className,
        globalLabSchedule,
        labResources || [],
        classConfig
      );

      // 4. Build list of remaining periods to schedule (non-lab, non-strict subjects)
      let unscheduledPeriods: any[] = [];
      classConfig.subjects.forEach((s: any) => {
        if (!s.isLab && !requiresStrictPeriodPlacement(s.name)) {
          const scheduled = scheduledCounts[s.name] || 0;
          for(let i = 0; i < s.periods - scheduled; i++) {
            const subjectWithShortName = {
              ...s,
              code: s.code || generateShortName(s.name)
            };
            unscheduledPeriods.push(subjectWithShortName);
          }
        }
      });

      // 5. Schedule remaining subjects with anti-collision rules
      const remainingShuffled = shuffleArray(unscheduledPeriods);
      let placedCount = 0;
      
      // Count how many periods each subject has
      const subjectPeriodCounts: { [subject: string]: number } = {};
      classConfig.subjects.forEach((s: any) => {
        const subjectName = s.code || s.name;
        subjectPeriodCounts[subjectName] = s.periods;
      });
      
      for (const subject of remainingShuffled) {
        const subjectName = subject.code || subject.name;
        const teacherName = subjectTeacherMap[subjectName] || subjectTeacherMap[subject.name] || "DefaultTeacher";
        const totalPeriodsForSubject = subjectPeriodCounts[subjectName] || 0;
        let bestSlot: { day: string; p: number } | null = null;

        // Find the best available slot (avoid strict periods for non-strict subjects)
        for (const day of dayNames) {
          // Count how many times this subject is already scheduled on this day
          const subjectCountOnDay = Object.values(attemptSchedule[day]).filter(s => s === subjectName).length;
          
          // If subject has <=5 periods, prevent duplicate on same day
          // If >5 periods, allow at most 2 per day (split before/after lunch)
          const maxPeriodsPerDay = totalPeriodsForSubject > 5 ? 2 : 1;
          if (subjectCountOnDay >= maxPeriodsPerDay) continue;
          
          for (let p = 1; p <= periodsPerDay; p++) {
            if (attemptSchedule[day][p]) continue;
            
            // Skip strict periods (4th and 7th) for non-strict subjects when possible
            const isStrictPeriod = p === 4 || p === 7;
            if (isStrictPeriod && !requiresStrictPeriodPlacement(subjectName)) {
              // Only use strict periods if no other options available
              const hasOtherSlots = dayNames.some(d => {
                for (let pp = 1; pp <= periodsPerDay; pp++) {
                  if (pp !== 4 && pp !== 7 && !attemptSchedule[d][pp]) return true;
                }
                return false;
              });
              if (hasOtherSlots) continue;
            }
            
            // For subjects with >5 periods, prefer splitting before/after lunch
            if (totalPeriodsForSubject > 5 && subjectCountOnDay === 1) {
              const existingPeriod = Object.entries(attemptSchedule[day]).find(([_, s]) => s === subjectName)?.[0];
              if (existingPeriod) {
                const existingPeriodNum = parseInt(existingPeriod);
                const lunchPeriod = classConfig.lunchAfter || 3;
                const existingBeforeLunch = existingPeriodNum <= lunchPeriod;
                const currentBeforeLunch = p <= lunchPeriod;
                
                // Skip if both are on same side of lunch
                if (existingBeforeLunch === currentBeforeLunch) continue;
              }
            }
            
            // Check teacher availability
            const available = isGamesSubject(subjectName) || 
              isTeacherAvailable(tempTeacherSchedule, teacherName, day, p);
            
            if (available) {
              bestSlot = { day, p };
              break;
            }
          }
          if (bestSlot) break;
        }

        if (bestSlot) {
          const { day, p } = bestSlot;
          attemptSchedule[day][p] = subjectName;
          assignTeacher(tempTeacherSchedule, teacherName, day, p, className, subjectName);
          placedCount++;
        } else {
          currentAttemptFailures.push(`Subject "${subjectName}" - No available slots`);
        }
      }
      
      // 6. Fill any remaining empty periods to ensure complete schedule
      const currentScheduledPeriods = Object.values(attemptSchedule).reduce((sum, day) => sum + Object.keys(day).length, 0);
      
      if (currentScheduledPeriods < totalPeriodsPerWeek) {
        // Fill remaining slots with most common subjects
        const subjectFrequency: { [subject: string]: number } = {};
        classConfig.subjects.forEach((s: any) => {
          if (!requiresStrictPeriodPlacement(s.name)) {
            subjectFrequency[s.code || s.name] = s.periods;
          }
        });
        
        const sortedSubjects = Object.entries(subjectFrequency)
          .sort(([,a], [,b]) => b - a)
          .map(([subject]) => subject);
        
        let fillIndex = 0;
        for (const day of dayNames) {
          for (let p = 1; p <= periodsPerDay; p++) {
            if (!attemptSchedule[day][p]) {
              // Fill all empty slots with subjects - no free periods
              if (sortedSubjects.length > 0) {
                const fillSubject = sortedSubjects[fillIndex % sortedSubjects.length];
                attemptSchedule[day][p] = fillSubject;
                fillIndex++;
              }
            }
          }
        }
      }
      
      // 7. Validate period counts for this schedule
      const validation = validatePeriodCounts(attemptSchedule, classConfig.subjects);
      
      if (!validation.isValid) {
        console.log(`✗ Retry ${retryCount + 1}/${maxRetries} - Period count mismatch for ${className}:`, validation.errors);
        needsRegeneration = true;
        generationErrors = validation.errors;
        retryCount++;
        continue;
      }
      
      // Check if we have a complete schedule
      const finalScheduledCount = Object.values(attemptSchedule).reduce((sum, day) => sum + Object.keys(day).length, 0);
      
      if (finalScheduledCount === totalPeriodsPerWeek) {
        classSchedule = attemptSchedule;
        success = true;
        
        // Update global teacher schedule
        Object.assign(globalTeacherSchedule, tempTeacherSchedule);
        
        console.log(`✓ Class ${className}: Successfully generated complete timetable in ${retryCount + 1} attempts`);
      } else {
        retryCount++;
        console.log(`Retrying class ${className} (attempt ${retryCount}) - scheduled ${finalScheduledCount}/${totalPeriodsPerWeek} periods`);
      }
      
    } catch (error) {
      retryCount++;
      const errorMessage = `Unexpected error: ${error}`;
      currentAttemptFailures.push(errorMessage);
      console.error(`Error generating timetable for class ${className}:`, error);
    }
  }
  
  // Handle failure after all retries - mark for regeneration
  if (!success) {
    console.log(`⚠ Class "${className}" failed period validation after ${retryCount} attempts. Marking for regeneration.`);
    
    // Create a temporary fallback schedule but mark it for regeneration
    const fallbackSchedule: { [day: string]: { [period: number]: string } } = {};
    dayNames.forEach(day => { fallbackSchedule[day] = {}; });
    
    // Distribute subjects proportionally to match expected periods
    const allSubjects = classConfig.subjects.flatMap((s: any) => 
      Array(s.periods).fill(s.code || s.name)
    );
    
    let subjectIndex = 0;
    for (const day of dayNames) {
      for (let p = 1; p <= periodsPerDay; p++) {
        if (subjectIndex < allSubjects.length) {
          fallbackSchedule[day][p] = allSubjects[subjectIndex];
          subjectIndex++;
        }
      }
    }
    
    classSchedule = fallbackSchedule;
    generationErrors.push(`Class "${className}" - Period count validation failed after ${maxRetries} attempts. Expected periods not matching generated periods. Needs regeneration.`);
    needsRegeneration = true;
  }
  
  return { success, schedule: classSchedule, errors: generationErrors, needsRegeneration };
}

// Enhanced function to create complete timetable without free periods
function generateCompleteScheduleWithoutFree(
  classConfig: any,
  facultyData: any[],
  globalTeacherSchedule: TeacherSchedule,
  combinableSubjects: Map<string, any[]>,
  combinedSubjectSchedule: Map<string, { day: string; period: number }[]>,
  regenerationCount: number = 0,
  labResources?: LabResource[],
  globalLabSchedule?: any
): { success: boolean; schedule: { [day: string]: { [period: number]: string } }; errors: string[] } {
  
  const className = classConfig.name;
  const { workingDays, periodsPerDay, lunchAfter, breakAfter, selectedDays } = classConfig;
  const totalPeriodsPerWeek = workingDays * periodsPerDay;

  console.log(`Generating complete timetable for class ${className} (regeneration ${regenerationCount})`);

  // Create day labels for this specific class
  const dayMapping = {
    'monday': 'Mon',
    'tuesday': 'Tue', 
    'wednesday': 'Wed',
    'thursday': 'Thu',
    'friday': 'Fri',
    'saturday': 'Sat',
    'sunday': 'Sun'
  };
  
  const dayNames = (selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    .slice(0, workingDays)
    .map(day => dayMapping[day as keyof typeof dayMapping]);

  const subjectTeacherMap = createSubjectTeacherMap(facultyData, className);

  let classSchedule: { [day: string]: { [period: number]: string } } = {};
  let success = false;
  let generationErrors: string[] = [];
  let maxRetries = 500;
  let retryCount = 0;
  
  // Retry loop for class generation
  while (!success && retryCount < maxRetries) {
    let attemptSchedule: { [day: string]: { [period: number]: string } } = {};
    dayNames.forEach(day => { attemptSchedule[day] = {}; });
    
    const tempTeacherSchedule = JSON.parse(JSON.stringify(globalTeacherSchedule));
    let currentAttemptFailures: string[] = [];

    try {
      // 1. Apply pre-scheduled combined subjects
      for (const [combineKey, subjects] of combinableSubjects.entries()) {
        const hasCurrentClass = subjects.some(s => s.className === className);
        if (!hasCurrentClass) continue;

        const currentClassSubject = subjects.find(s => s.className === className);
        if (!currentClassSubject) continue;

        const scheduledSlots = combinedSubjectSchedule.get(combineKey);
        if (scheduledSlots) {
          const subjectName = currentClassSubject.code || currentClassSubject.name;
          const teacherName = currentClassSubject.teacher;
          
          scheduledSlots.forEach(slot => {
            if (dayNames.includes(slot.day)) {
              attemptSchedule[slot.day][slot.period] = subjectName;
              if (!tempTeacherSchedule[teacherName][slot.day][slot.period]) {
                tempTeacherSchedule[teacherName][slot.day][slot.period] = [];
              }
              tempTeacherSchedule[teacherName][slot.day][slot.period] = 
                tempTeacherSchedule[teacherName][slot.day][slot.period].filter(a => !a.className.includes('+'));
              tempTeacherSchedule[teacherName][slot.day][slot.period].push({ className, subjectName });
            }
          });
        }
      }

      // 2. Schedule STRICT subjects first (mentor, yoga, sports, library - only 4th and 7th periods)
      const strictSubjects = classConfig.subjects.filter((s: any) => 
        !s.isLab && requiresStrictPeriodPlacement(s.name)
      );
      
      console.log(`Found ${strictSubjects.length} strict subjects:`, strictSubjects.map(s => s.name));
      
      for (const subject of strictSubjects) {
        const subjectName = subject.code || subject.name;
        const teacherName = subjectTeacherMap[subjectName] || subjectTeacherMap[subject.name] || "DefaultTeacher";
        const allowedPeriods = getStrictAllowedPeriods(subjectName, periodsPerDay);
        
        console.log(`Scheduling strict subject ${subjectName} to periods: ${allowedPeriods.join(', ')}`);
        
        let periodsPlaced = 0;
        for (let i = 0; i < subject.periods && periodsPlaced < subject.periods; i++) {
          let placed = false;
          
          // Try to place in allowed periods only
          for (const day of shuffleArray([...dayNames])) {
            for (const period of shuffleArray([...allowedPeriods])) {
              if (!attemptSchedule[day][period] && 
                  isTeacherAvailable(tempTeacherSchedule, teacherName, day, period)) {
                attemptSchedule[day][period] = subjectName;
                assignTeacher(tempTeacherSchedule, teacherName, day, period, className, subjectName);
                periodsPlaced++;
                placed = true;
                console.log(`✓ Placed strict subject ${subjectName} on ${day} period ${period}`);
                break;
              }
            }
            if (placed) break;
          }
          
          if (!placed) {
            currentAttemptFailures.push(`Cannot place strict subject "${subjectName}" in allowed periods (${allowedPeriods.join(', ')})`);
            console.log(`✗ Failed to place strict subject ${subjectName}`);
          }
        }
      }

      // 3. Schedule Labs with enhanced consecutive scheduling (2 periods)
      const labSubjects = classConfig.subjects.filter((s: any) => s.isLab);
      const scheduledCounts = scheduleLabsConsecutively(
        attemptSchedule,
        labSubjects,
        dayNames,
        periodsPerDay,
        tempTeacherSchedule,
        subjectTeacherMap,
        className,
        globalLabSchedule,
        labResources || [],
        classConfig
      );

      // 4. Build comprehensive list of all periods that need to be scheduled
      let allPeriodsToSchedule: any[] = [];
      classConfig.subjects.forEach((s: any) => {
        if (!s.isLab) {
          const alreadyScheduled = Object.values(attemptSchedule).reduce((count, daySchedule) => {
            return count + Object.values(daySchedule).filter(subj => 
              subj === (s.code || s.name) || subj === s.name
            ).length;
          }, 0);
          
          const remaining = s.periods - alreadyScheduled;
          for(let i = 0; i < remaining; i++) {
            allPeriodsToSchedule.push({
              ...s,
              code: s.code || generateShortName(s.name)
            });
          }
        }
      });

      console.log(`Total periods to schedule: ${allPeriodsToSchedule.length}`);

      // 5. EVEN DISTRIBUTION: Schedule subjects evenly across days
      // Group remaining periods by subject
      const subjectGroups: { [subject: string]: any[] } = {};
      allPeriodsToSchedule.forEach(period => {
        const subjectName = period.code || period.name;
        if (!subjectGroups[subjectName]) {
          subjectGroups[subjectName] = [];
        }
        subjectGroups[subjectName].push(period);
      });
      
      // Schedule each subject evenly across days
      for (const [subjectName, periods] of Object.entries(subjectGroups)) {
        const teacherName = subjectTeacherMap[subjectName] || subjectTeacherMap[periods[0].name] || "DefaultTeacher";
        let periodIndex = 0;
        
        // Distribute evenly across days
        for (const day of dayNames) {
          if (periodIndex >= periods.length) break;
          
          for (let p = 1; p <= periodsPerDay && periodIndex < periods.length; p++) {
            // Skip if already filled
            if (attemptSchedule[day][p]) continue;
            
            // Check if this would create duplicate on same day (unless >5 periods)
            const totalPeriodsForSubject = periods.length;
            if (totalPeriodsForSubject <= 5) {
              const isDuplicate = wouldCreateDuplicateOnSameDay(
                attemptSchedule,
                day,
                p,
                subjectName,
                lunchAfter,
                periodsPerDay
              );
              if (isDuplicate) continue;
            } else {
              // For subjects with >5 periods, allow one before and one after lunch
              const isDuplicate = wouldCreateDuplicateOnSameDay(
                attemptSchedule,
                day,
                p,
                subjectName,
                lunchAfter,
                periodsPerDay
              );
              if (isDuplicate) continue;
            }
            
            // Check if this is a strict period (last period) and subject is not strict
            const isLastPeriod = p === periodsPerDay;
            const isSubjectStrict = requiresStrictPeriodPlacement(periods[0].name);
            
            // Reserve last period for strict subjects
            if (isLastPeriod && !isSubjectStrict) continue;
            
            // Check teacher availability
            const available = isGamesSubject(subjectName) || 
              isTeacherAvailable(tempTeacherSchedule, teacherName, day, p);
            
            if (available) {
              attemptSchedule[day][p] = subjectName;
              assignTeacher(tempTeacherSchedule, teacherName, day, p, className, subjectName);
              periodIndex++;
            }
          }
        }
      }
      
      // 6. Final pass: ensure NO empty slots remain - fill with most frequent subjects
      const subjectFrequency: { [subject: string]: number } = {};
      classConfig.subjects.forEach((s: any) => {
        if (!requiresStrictPeriodPlacement(s.name)) {
          subjectFrequency[s.code || s.name] = s.periods;
        }
      });
      
      const sortedSubjects = Object.entries(subjectFrequency)
        .sort(([,a], [,b]) => b - a)
        .map(([subject]) => subject);
      
      let fillIndex = 0;
      for (const day of dayNames) {
        for (let p = 1; p <= periodsPerDay; p++) {
          if (!attemptSchedule[day][p]) {
            if (sortedSubjects.length > 0) {
              const fillSubject = sortedSubjects[fillIndex % sortedSubjects.length];
              attemptSchedule[day][p] = fillSubject;
              fillIndex++;
              console.log(`Filled empty slot ${day} P${p} with ${fillSubject}`);
            }
          }
        }
      }
      
      // Verify no free periods exist
      const finalScheduledCount = Object.values(attemptSchedule).reduce((sum, day) => sum + Object.keys(day).length, 0);
      const hasFreeSlots = Object.values(attemptSchedule).some(daySchedule => 
        Object.values(daySchedule).some(subject => !subject || subject === "Free")
      );
      
      if (finalScheduledCount === totalPeriodsPerWeek && !hasFreeSlots) {
        classSchedule = attemptSchedule;
        success = true;
        Object.assign(globalTeacherSchedule, tempTeacherSchedule);
        console.log(`✓ Class ${className}: Complete timetable generated without free periods`);
      } else {
        retryCount++;
        console.log(`Retrying class ${className} (attempt ${retryCount}) - has free periods or incomplete`);
      }
      
    } catch (error) {
      retryCount++;
      currentAttemptFailures.push(`Unexpected error: ${error}`);
      console.error(`Error generating timetable for class ${className}:`, error);
    }
  }
  
  if (!success) {
    generationErrors.push(`Class "${className}" - Could not generate complete timetable without free periods after ${retryCount} attempts`);
  }
  
  return { success, schedule: classSchedule, errors: generationErrors };
}

// Enhanced function to extract faculty details from config and faculty data
function extractFacultyDetails(
  classConfig: any,
  facultyData: any[],
  className: string
): { facultyName: string; subjectName: string; subjectCode: string; periodsPerWeek: number; contactNumber?: string }[] {
  const facultyDetails: { facultyName: string; subjectName: string; subjectCode: string; periodsPerWeek: number; contactNumber?: string }[] = [];
  
  console.log(`Extracting faculty details for class ${className}`);
  
  classConfig.subjects.forEach((subject: any) => {
    const subjectName = subject.name;
    const subjectCode = subject.code || generateShortName(subject.name);
    const periodsPerWeek = subject.periods;
    
    // Find faculty member for this subject
    let facultyName = "Not Assigned";
    let contactNumber = "";
    
    facultyData.forEach(row => {
      const classField = row.Classes || row.Class || row.classes || row.class || '';
      const subjectField = row.Subject || row.subject || row.Subjects || row.subjects || '';
      const nameField = row.Name || row.name || row.Teacher || row.teacher || '';
      const contactField = row.Contact || row.contact || row.ContactNo || row.contactno || row.Phone || row.phone || '';
      
      if (!classField || !subjectField || !nameField) return;
      
      // Handle both comma-separated and single class entries
      let classNames: string[] = [];
      if (typeof classField === 'string') {
        if (classField.includes(',')) {
          classNames = classField.split(',').map((c: string) => c.trim()).filter(Boolean);
        } else {
          classNames = [classField.trim()];
        }
      }
      
      if (classNames.includes(className) && 
          (subjectField.trim().toLowerCase().includes(subjectName.toLowerCase()) || 
           subjectName.toLowerCase().includes(subjectField.trim().toLowerCase()))) {
        facultyName = nameField.trim();
        contactNumber = contactField ? contactField.toString().trim() : "";
      }
    });
    
    facultyDetails.push({
      facultyName,
      subjectName,
      subjectCode,
      periodsPerWeek,
      contactNumber
    });
  });
  
  console.log(`Faculty details for ${className}:`, facultyDetails);
  return facultyDetails;
}

// Main generation function with regeneration for period validation
export function generateTimetables(
  config: any, 
  facultyData: any[], 
  labResources?: LabResource[], 
  classCapacities?: ClassCapacityInfo[]
) {
  const { classes, regenerationCount = 0, maxRegenerations = 50, onRegenerationError } = config;
  let generationErrors: string[] = [];
  let hasValidationErrors = false;

  console.log(`Starting timetable generation (regeneration ${regenerationCount}/${maxRegenerations})`);

  const sortedClasses = [...classes].sort((a: any, b: any) => classNameSorter(a.name, b.name));
  const allTeachers = [...new Set(facultyData.map(row => row.Name || row.name || row.Teacher || row.teacher).filter(Boolean))];
  const allPossibleDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const teacherSchedule: TeacherSchedule = createEmptyTeacherSchedule(allTeachers, allPossibleDays);

  // Initialize global lab schedule to track lab resource usage across all classes
  const globalLabSchedule: any = {};
  allPossibleDays.forEach(day => {
    globalLabSchedule[day] = {};
  });

  const combinableSubjects = new Map<string, any[]>();
  const combinedSubjectSchedule = new Map<string, { day: string; period: number }[]>();
  
  // First pass: identify all combinable subjects
  sortedClasses.forEach(classConfig => {
    classConfig.subjects.forEach((subject: any) => {
      if (subject.allowCombine && subject.teacher && subject.teacher !== "N/A" && subject.combineWithClasses && subject.combineWithClasses.length > 0) {
        const key = `${subject.code || subject.name}_${subject.teacher}`;
        if (!combinableSubjects.has(key)) {
          combinableSubjects.set(key, []);
        }
        
        // Add the current class
        const currentSubjectEntry = {
          ...subject,
          className: classConfig.name,
          classConfig: classConfig
        };
        combinableSubjects.get(key)!.push(currentSubjectEntry);
        
        // Add selected classes to combine with
        subject.combineWithClasses.forEach((selectedClassName: string) => {
          const selectedClass = sortedClasses.find(c => c.name === selectedClassName);
          if (selectedClass) {
            const matchingSubject = selectedClass.subjects.find(s => 
              (s.code === subject.code || s.name === subject.name) &&
              s.teacher === subject.teacher &&
              s.allowCombine &&
              s.combineWithClasses &&
              s.combineWithClasses.includes(classConfig.name)
            );
            
            if (matchingSubject) {
              const selectedSubjectEntry = {
                ...matchingSubject,
                className: selectedClass.name,
                classConfig: selectedClass
              };
              
              const existingEntries = combinableSubjects.get(key) || [];
              const alreadyExists = existingEntries.some(entry => entry.className === selectedClass.name);
              
              if (!alreadyExists) {
                combinableSubjects.get(key)!.push(selectedSubjectEntry);
              }
            }
          }
        });
      }
    });
  });

  // Filter out subjects that appear in only one class
  for (const [key, subjects] of combinableSubjects.entries()) {
    if (subjects.length < 2) {
      combinableSubjects.delete(key);
    }
  }

  console.log("Combinable subjects found:", combinableSubjects);

  // Pre-schedule all combined subjects to ensure synchronization
  for (const [combineKey, subjects] of combinableSubjects.entries()) {
    const firstSubject = subjects[0];
    const subjectName = firstSubject.code || firstSubject.name;
    const teacherName = firstSubject.teacher;
    const periodsNeeded = firstSubject.periods;

    // Find common available days for all classes in this group
    const dayMapping = {
      'monday': 'Mon',
      'tuesday': 'Tue', 
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun'
    };

    // Get intersection of all working days for classes in this group
    let commonDays: string[] = [];
    subjects.forEach((subjectEntry, index) => {
      const classConfigForSubject = subjectEntry.classConfig;
      const classDayNames = (classConfigForSubject.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
        .slice(0, classConfigForSubject.workingDays)
        .map(d => dayMapping[d as keyof typeof dayMapping]);
      
      if (index === 0) {
        commonDays = [...classDayNames];
      } else {
        commonDays = commonDays.filter(day => classDayNames.includes(day));
      }
    });

    if (commonDays.length === 0) {
      generationErrors.push(`No common working days found for combined subject "${subjectName}"`);
      continue;
    }

    // Find the minimum periods per day across all classes
    const minPeriodsPerDay = Math.min(...subjects.map(s => s.classConfig.periodsPerDay));

    let scheduledPeriods: { day: string; period: number }[] = [];
    
    // Schedule periods for this combined subject
    for (let p = 0; p < periodsNeeded; p++) {
      let foundSlot = false;
      
      for (const day of commonDays) {
        for (let period = 1; period <= minPeriodsPerDay; period++) {
          // Check if teacher is available at this time
          if (isTeacherAvailable(teacherSchedule, teacherName, day, period)) {
            // Check if this slot is not already used for this combined subject
            if (!scheduledPeriods.some(sp => sp.day === day && sp.period === period)) {
              scheduledPeriods.push({ day, period });
              // Reserve teacher slot
              assignTeacher(teacherSchedule, teacherName, day, period, subjects.map(s => s.className).join('+'), subjectName);
              foundSlot = true;
              break;
            }
          }
        }
        if (foundSlot) break;
      }
      
      if (!foundSlot) {
        generationErrors.push(`Cannot find common slot for combined subject "${subjectName}" period ${p + 1}`);
        break;
      }
    }
    
    if (scheduledPeriods.length === periodsNeeded) {
      combinedSubjectSchedule.set(combineKey, scheduledPeriods);
      console.log(`Pre-scheduled combined subject "${subjectName}" at:`, scheduledPeriods);
    }
  }

  // Generate class timetables with enhanced period validation and faculty details
  const classTimetables = sortedClasses.map((classConfig: any) => {
    const className = classConfig.name;
    const { workingDays, periodsPerDay, lunchAfter, breakAfter, selectedDays } = classConfig;

    console.log(`Processing class ${className} (regeneration ${regenerationCount})`);

    // Extract faculty details for this class
    const facultyDetails = extractFacultyDetails(classConfig, facultyData, className);

    let result = generateSingleClassTimetable(
      classConfig,
      facultyData,
      teacherSchedule,
      combinableSubjects,
      combinedSubjectSchedule,
      regenerationCount,
      labResources,
      globalLabSchedule
    );

    if (!result.success || result.needsRegeneration) {
      generationErrors.push(...result.errors);
      hasValidationErrors = true;
    }

    // Enhanced table creation with proper formatting
    let table: string[][] = [];
    
    if (result.schedule) {
      const classSchedule = result.schedule;

      const dayMapping = {
        'monday': 'Mon',
        'tuesday': 'Tue', 
        'wednesday': 'Wed',
        'thursday': 'Thu',
        'friday': 'Fri',
        'saturday': 'Sat',
        'sunday': 'Sun'
      };
      
      const dayNames = (selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
        .slice(0, workingDays)
        .map(day => dayMapping[day as keyof typeof dayMapping]);

      // Create period headers with single time slots
      const periodHeaders = ["Day"];
      for (let p = 1; p <= periodsPerDay; p++) {
        const startHour = 9 + Math.floor((p - 1) * 50 / 60);
        const startMin = ((p - 1) * 50) % 60;
        const endHour = 9 + Math.floor(p * 50 / 60);
        const endMin = (p * 50) % 60;
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        periodHeaders.push(`${startTime}-${endTime}`);
        
        if (p === breakAfter) {
          periodHeaders.push("Break");
        }
        if (p === lunchAfter) {
          periodHeaders.push("Lunch");
        }
      }

      const subjectTeacherMap = createSubjectTeacherMap(facultyData, className);
      
      // Build the enhanced table
      table = [periodHeaders];
      dayNames.forEach(day => {
        const dayRow = [day];
        for (let p = 1; p <= periodsPerDay; p++) {
          const scheduledSubject = classSchedule[day]?.[p] || "";
          if (scheduledSubject) {
            dayRow.push(scheduledSubject);
          }
          
          if (p === breakAfter) {
            dayRow.push("BREAK");
          }
          if (p === lunchAfter) {
            dayRow.push("LUNCH");
          }
        }
        table.push(dayRow);
      });

      console.log(`✓ Class ${className}: Enhanced timetable generated successfully`);
    }

    return {
      name: className,
      table,
      facultyDetails, // Include faculty details in the response
    };
  }).filter(Boolean);

  // Generate teacher timetables with enhanced formatting
  const teacherTimetables = allTeachers.map(teacherName => {
    let maxWorkingDays = 0;
    let maxPeriodsPerDay = 0;
    let commonLunchAfter = 4;
    let commonBreakAfter = 2;
    let allUsedDays = new Set<string>();

    sortedClasses.forEach(classConfig => {
      const dayMapping = {
        'monday': 'Mon',
        'tuesday': 'Tue', 
        'wednesday': 'Wed',
        'thursday': 'Thu',
        'friday': 'Fri',
        'saturday': 'Sat',
        'sunday': 'Sun'
      };
      
      const classDayNames = (classConfig.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
        .slice(0, classConfig.workingDays)
        .map(day => dayMapping[day as keyof typeof dayMapping]);
      
      classDayNames.forEach(day => allUsedDays.add(day));
      
      if (classConfig.workingDays > maxWorkingDays) {
        maxWorkingDays = classConfig.workingDays;
      }
      if (classConfig.periodsPerDay > maxPeriodsPerDay) {
        maxPeriodsPerDay = classConfig.periodsPerDay;
        commonLunchAfter = classConfig.lunchAfter;
        commonBreakAfter = classConfig.breakAfter;
      }
    });

    const teacherDayNames = Array.from(allUsedDays).sort((a, b) => {
      const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });

    const teacherPeriodHeaders = ["Day / Time"];
    for (let p = 1; p <= maxPeriodsPerDay; p++) {
      const startTime = `${8 + p}:${p === 1 ? '00' : (p-1)*50}`;
      const endTime = `${8 + p}:${p*50}`;
      teacherPeriodHeaders.push(`${startTime}-${endTime}`);
      
      if (p === commonBreakAfter) {
        teacherPeriodHeaders.push("Break");
      }
      if (p === commonLunchAfter) {
        teacherPeriodHeaders.push("Lunch");
      }
    }

    const table = [teacherPeriodHeaders];

    teacherDayNames.forEach(day => {
      const dayRow = [day];

      for (let p = 1; p <= maxPeriodsPerDay; p++) {
        const assignments = teacherSchedule[teacherName]?.[day]?.[p];
        if (assignments && assignments.length) {
          const assignmentText = assignments.length > 1 
            ? `${assignments[0].subjectName} (${assignments.map(a => a.className).join('+')})`
            : `${assignments[0].subjectName} (${assignments[0].className})`;
          dayRow.push(assignmentText);
        } else {
          dayRow.push("");
        }

        if (p === commonBreakAfter) {
          dayRow.push("BREAK");
        }
        if (p === commonLunchAfter) {
          dayRow.push("LUNCH");
        }
      }

      table.push(dayRow);
    });

    return {
      name: teacherName,
      table
    };
  });

  console.log('Enhanced Generation Summary:');
  console.log(`Regeneration: ${regenerationCount}/${maxRegenerations}`);
  console.log(`Total classes: ${sortedClasses.length}`);
  console.log(`Successful: ${classTimetables.length}`);
  console.log(`Total errors: ${generationErrors.length}`);
  console.log(`Has validation errors: ${hasValidationErrors}`);

  return {
    classes: classTimetables,
    teachers: teacherTimetables,
    errors: generationErrors,
    regenerationCount,
    canRegenerate: hasValidationErrors && regenerationCount < maxRegenerations,
    needsRegeneration: hasValidationErrors
  };
}

// Helper function to check teacher availability for special subjects
function isTeacherAvailableForSpecialSubjects(
  teacherSchedule: TeacherSchedule, 
  teacherName: string, 
  day: string, 
  period: number, 
  subjectName: string, 
  className: string
) {
  if (!teacherName) return true;
  
  const assignments = teacherSchedule[teacherName]?.[day]?.[period];
  if (!assignments || !assignments.length) return true;
  
  const specialSubjects = ['library', 'mentor', 'sports', 'games'];
  const isSpecialSubject = specialSubjects.some(s => subjectName.toLowerCase().includes(s));
  
  if (isSpecialSubject) {
    return !assignments.some(assignment => assignment.className === className);
  }
  
  return false;
}
