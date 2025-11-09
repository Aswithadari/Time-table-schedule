/**
 * Helper functions for timetable generation and subject/teacher logic.
 */

// Is a subject a "special" (e.g. yoga, games, library, mentor, sports, mentoring)
export function isSpecialSubject(subjectName: string) {
  if (!subjectName) return false;
  const specialKeywords = ["yoga", "games", "library", "mentor", "sports", "mentoring", "counseling"];
  return specialKeywords.some(keyword => subjectName.toLowerCase().includes(keyword));
}

// Is a subject "Games" (for teacher conflict rules)
export function isGamesSubject(subjectName: string) {
  return subjectName && subjectName.toLowerCase().includes("games");
}

// Is a subject a "free period" (games, library, mentor, counseling etc) for after lunch
export function isFreePeriodSubject(subjectName: string) {
  if (!subjectName) return false;
  const freeKeywords = ["games", "library", "mentor", "counseling", "sports"];
  return freeKeywords.some(keyword => subjectName.toLowerCase().includes(keyword));
}

// Check if a subject is mentor (should be STRICTLY 4th or 7th period only)
export function isMentorSubject(subjectName: string) {
  return subjectName && subjectName.toLowerCase().includes("mentor");
}

// Check if a subject is yoga (should be STRICTLY 4th or 7th period only)
export function isYogaSubject(subjectName: string) {
  return subjectName && subjectName.toLowerCase().includes("yoga");
}

// Check if a subject is sports (should be STRICTLY 4th or 7th period only)
export function isSportsSubject(subjectName: string) {
  return subjectName && subjectName.toLowerCase().includes("sports");
}

// Check if a subject is library (should be STRICTLY 4th or 7th period only)
export function isLibrarySubject(subjectName: string) {
  return subjectName.toLowerCase().includes('library');
}

// Check if a subject requires STRICT period placement (mentor, yoga, sports, library - only 4th and 7th)
export function requiresStrictPeriodPlacement(subjectName: string) {
  return isMentorSubject(subjectName) || isYogaSubject(subjectName) || isSportsSubject(subjectName) || isLibrarySubject(subjectName);
}

// Get STRICT allowed periods for mentor/yoga/sports/library (LAST PERIODS ONLY)
export function getStrictAllowedPeriods(subjectName: string, periodsPerDay: number): number[] {
  if (requiresStrictPeriodPlacement(subjectName)) {
    // Special subjects MUST be placed in the last period only
    return [periodsPerDay];
  }
  return [];
}

// Check if a subject is games or library (can be before break/lunch/last)
export function isGamesOrLibrarySubject(subjectName: string) {
  if (!subjectName) return false;
  return subjectName.toLowerCase().includes("games") || subjectName.toLowerCase().includes("library");
}

// Validate period count is within 0+ range (removed upper limit)
export function validatePeriodRange(periods: number): boolean {
  return periods >= 0;
}

// Clamp period count to valid range (0+, no upper limit)
export function clampPeriodCount(periods: number): number {
  return Math.max(0, periods);
}

// Generate short name from full subject name - fix for library
export function generateShortName(subjectName: string): string {
  // Special handling for library - don't generate shortcut
  if (subjectName.toLowerCase().includes('library')) {
    return 'library';
  }
  
  // Remove common words and clean up
  const wordsToRemove = ['and', 'of', 'the', 'in', 'for', 'with', 'by', 'to', 'from'];
  const words = subjectName
    .split(' ')
    .filter(word => word.length > 0 && !wordsToRemove.includes(word.toLowerCase()));
  
  if (words.length === 1) {
    // Single word - take first 6 characters
    return words[0].substring(0, 6).toUpperCase();
  } else if (words.length === 2) {
    // Two words - take first 3 chars of each
    return (words[0].substring(0, 3) + words[1].substring(0, 3)).toUpperCase();
  } else {
    // Multiple words - take first char of each word, max 6 chars
    return words
      .slice(0, 6)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}

// Auto-generate course/year/sem from class name
export function parseCourseDetails(className: string): { course: string; year: string; sem: string } {
  if (!className) return { course: 'B.Tech', year: 'I', sem: 'I' };
  
  // Extract year from class name (like "1st Year", "2nd Year", etc.)
  const yearMatch = className.match(/(\d+)/);
  let year = 'I';
  let sem = 'I';
  
  if (yearMatch) {
    const yearNum = parseInt(yearMatch[1]);
    switch (yearNum) {
      case 1:
        year = 'I';
        sem = className.toLowerCase().includes('ii') ? 'II' : 'I';
        break;
      case 2:
        year = 'II';
        sem = className.toLowerCase().includes('ii') ? 'II' : 'I';
        break;
      case 3:
        year = 'III';
        sem = className.toLowerCase().includes('ii') ? 'II' : 'I';
        break;
      case 4:
        year = 'IV';
        sem = className.toLowerCase().includes('ii') ? 'II' : 'I';
        break;
    }
  }
  
  // Determine course based on class name patterns
  let course = 'B.Tech';
  if (className.toLowerCase().includes('cse') || className.toLowerCase().includes('csm') || className.toLowerCase().includes('csd')) {
    course = 'B.Tech CSE';
  } else if (className.toLowerCase().includes('ece')) {
    course = 'B.Tech ECE';
  } else if (className.toLowerCase().includes('mech')) {
    course = 'B.Tech MECH';
  } else if (className.toLowerCase().includes('civil')) {
    course = 'B.Tech CIVIL';
  }
  
  return { course, year, sem };
}

// Sorter to order classes digit-first, then alphabetically
export function classNameSorter(a: string, b: string) {
  if (!a || !b) return 0;
  
  const digitA = a.match(/^\d+/);
  const digitB = b.match(/^\d+/);
  if (digitA && digitB) {
    const numA = parseInt(digitA[0], 10);
    const numB = parseInt(digitB[0], 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  } else if (digitA) {
    return -1;
  } else if (digitB) {
    return 1;
  }
  return a.localeCompare(b);
}

// Fisher-Yates shuffle algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// Teacher schedule structure and helpers
export type TeacherSchedule = { 
  [teacher: string]: { 
    [day: string]: { [period: number]: Array<{ className: string; subjectName: string }> } 
  } 
};

// Initialize teacher schedule structure
export function createEmptyTeacherSchedule(teachers: string[], days: string[]): TeacherSchedule {
  const teacherSchedule: TeacherSchedule = {};
  teachers.forEach(teacher => {
    teacherSchedule[teacher] = {};
    days.forEach(day => {
      teacherSchedule[teacher][day] = {};
    });
  });
  return teacherSchedule;
}

// Enhanced teacher availability check with special subject handling
export function isTeacherAvailable(teacherSchedule: TeacherSchedule, teacherName: string, day: string, period: number, subjectName?: string): boolean {
  if (!teacherName) return true;
  
  // Special handling for Games subjects - they can share teachers
  if (isGamesSubject(subjectName || "")) return true;
  
  // Ensure teacher exists in schedule
  if (!teacherSchedule[teacherName]) return true;
  if (!teacherSchedule[teacherName][day]) return true;
  
  const assignments = teacherSchedule[teacherName][day][period];
  return !assignments || assignments.length === 0;
}

// Check teacher availability specifically for special subjects
export function isTeacherAvailableForSpecialSubjects(
  teacherSchedule: TeacherSchedule, 
  teacherName: string, 
  day: string, 
  period: number, 
  subjectName: string, 
  className: string
): boolean {
  if (!teacherName) return true;
  
  // Ensure teacher exists in schedule
  if (!teacherSchedule[teacherName]) return true;
  if (!teacherSchedule[teacherName][day]) return true;
  
  const assignments = teacherSchedule[teacherName][day][period];
  if (!assignments || !assignments.length) return true;
  
  // For special subjects, check if the same class is already assigned
  if (isSpecialSubject(subjectName)) {
    return !assignments.some(assignment => assignment.className === className);
  }
  
  return false;
}

// Assign teacher to a period with validation
export function assignTeacher(teacherSchedule: TeacherSchedule, teacherName: string, day: string, period: number, className: string, subjectName: string): boolean {
  if (!teacherName) return true;
  
  // Ensure teacher structure is initialized
  if (!teacherSchedule[teacherName]) {
    teacherSchedule[teacherName] = {};
  }
  if (!teacherSchedule[teacherName][day]) {
    teacherSchedule[teacherName][day] = {};
  }
  if (!teacherSchedule[teacherName][day][period]) {
    teacherSchedule[teacherName][day][period] = [];
  }
  
  // Check for conflicts unless it's a Games subject
  if (!isGamesSubject(subjectName)) {
    const existingAssignments = teacherSchedule[teacherName][day][period];
    if (existingAssignments.length > 0) {
      console.warn(`Teacher ${teacherName} already assigned at ${day} P${period}`);
      return false;
    }
  }
  
  teacherSchedule[teacherName][day][period].push({ className, subjectName });
  return true;
}

// Enhanced consecutive periods check with configurable limits based on period count
export function hasConsecutivePeriods(
  schedule: { [day: string]: { [period: number]: string } }, 
  subjectName: string, 
  subjectPeriods: number
): boolean {
  // Determine max consecutive periods: if >9 periods allow 2, otherwise 1
  const maxConsecutive = subjectPeriods > 9 ? 2 : 1;
  
  for (const day in schedule) {
    const daySchedule = schedule[day];
    const periods = Object.keys(daySchedule).map(Number).sort((a, b) => a - b);
    
    let consecutiveCount = 0;
    for (const period of periods) {
      if (daySchedule[period] === subjectName) {
        consecutiveCount++;
        if (consecutiveCount > maxConsecutive) {
          return true;
        }
      } else {
        consecutiveCount = 0;
      }
    }
  }
  return false;
}

// Enhanced check for consecutive period creation with proper validation
export function wouldCreateConsecutivePeriods(
  schedule: { [day: string]: { [period: number]: string } }, 
  day: string, 
  period: number, 
  subjectName: string, 
  subjectPeriods: number
): boolean {
  // Create a temporary schedule with the new assignment
  const tempSchedule = JSON.parse(JSON.stringify(schedule));
  tempSchedule[day][period] = subjectName;
  
  return hasConsecutivePeriods(tempSchedule, subjectName, subjectPeriods);
}

// Get strictly preferred periods for mentor/library/sports subjects
export function getStrictPreferredPeriodsForSubject(subjectName: string, periodsPerDay: number, lunchAfter: number): number[] {
  const preferredPeriods: number[] = [];
  
  if (isMentorSubject(subjectName) || isLibrarySubject(subjectName) || isSportsSubject(subjectName)) {
    // STRICTLY 4th and 7th periods only
    if (periodsPerDay >= 4) preferredPeriods.push(4);
    if (periodsPerDay >= 7) preferredPeriods.push(7);
  }
  
  return preferredPeriods;
}

// Check if a period is strictly preferred for mentor/library/sports subjects
export function isStrictPreferredPeriodForSubject(subjectName: string, period: number, periodsPerDay: number, lunchAfter: number): boolean {
  const preferredPeriods = getStrictPreferredPeriodsForSubject(subjectName, periodsPerDay, lunchAfter);
  return preferredPeriods.includes(period);
}

// Get preferred periods for special subjects with enhanced logic
export function getPreferredPeriodsForSubject(subjectName: string, periodsPerDay: number, lunchAfter: number, breakAfter: number): number[] {
  const preferredPeriods: number[] = [];
  
  if (isMentorSubject(subjectName) || isLibrarySubject(subjectName) || isSportsSubject(subjectName)) {
    // These subjects strictly require 4th and 7th periods
    if (periodsPerDay >= 4) preferredPeriods.push(4);
    if (periodsPerDay >= 7) preferredPeriods.push(7);
  } else if (isGamesSubject(subjectName)) {
    // Games can be before break, lunch, or last period
    if (breakAfter > 1) preferredPeriods.push(breakAfter);
    if (lunchAfter > 1 && lunchAfter !== breakAfter) preferredPeriods.push(lunchAfter);
    preferredPeriods.push(periodsPerDay);
  } else if (isFreePeriodSubject(subjectName)) {
    // Other free period subjects prefer afternoon slots
    const afternoonStart = Math.max(lunchAfter + 1, Math.floor(periodsPerDay * 0.6));
    for (let p = afternoonStart; p <= periodsPerDay; p++) {
      preferredPeriods.push(p);
    }
  }
  
  return preferredPeriods;
}

// Check if a period is preferred for a subject
export function isPreferredPeriodForSubject(subjectName: string, period: number, periodsPerDay: number, lunchAfter: number, breakAfter: number): boolean {
  const preferredPeriods = getPreferredPeriodsForSubject(subjectName, periodsPerDay, lunchAfter, breakAfter);
  return preferredPeriods.includes(period);
}

// Validate total periods allocation for a class
export function validateClassPeriodAllocation(subjects: any[], totalPeriodsPerWeek: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  let isValid = true;
  
  // Check individual subject period ranges (0+, no upper limit)
  const invalidSubjects = subjects.filter(subject => {
    const periods = Number(subject.periods) || 0;
    return !validatePeriodRange(periods);
  });
  
  if (invalidSubjects.length > 0) {
    isValid = false;
    errors.push(`Subjects with invalid period counts (must be 0+): ${invalidSubjects.map(s => s.name).join(', ')}`);
  }
  
  // Check total allocation
  const totalAssigned = subjects.reduce((sum, subject) => sum + (Number(subject.periods) || 0), 0);
  if (totalAssigned !== totalPeriodsPerWeek) {
    isValid = false;
    errors.push(`Total periods (${totalAssigned}) must equal ${totalPeriodsPerWeek}`);
  }
  
  return { isValid, errors };
}

// Calculate optimal period distribution for subjects with updated defaults
export function calculateOptimalPeriodDistribution(subjects: any[], totalPeriods: number): any[] {
  if (!subjects.length || !totalPeriods) return subjects;

  const specialKeywords = ['games', 'yoga', 'arts', 'counseling', 'library', 'nurse', 'sports', 'mentoring', 'mentor', 'environmentalscience', 'es'];
  
  // Separate special and regular subjects
  const specialSubjects = subjects.filter(subj => 
    specialKeywords.some(keyword => subj.name?.toLowerCase().includes(keyword)) || subj.isLab
  );
  const regularSubjects = subjects.filter(subj => 
    !specialKeywords.some(keyword => subj.name?.toLowerCase().includes(keyword)) && !subj.isLab
  );
  
  // Set periods for special subjects and generate short names
  const processedSpecialSubjects = specialSubjects.map(subj => {
    let periods = 1; // Default for special subjects
    
    if (subj.isLab) {
      periods = Math.min(6, subj.periods || 3);
    } else if (subj.name?.toLowerCase().includes('mentor') || 
               subj.name?.toLowerCase().includes('library') || 
               subj.name?.toLowerCase().includes('sports')) {
      periods = 1; // Ensure default is 1 for mentor, library, sports
    }
    
    return {
      ...subj,
      periods,
      code: subj.code || generateShortName(subj.name)
    };
  });
  
  const specialPeriodsUsed = processedSpecialSubjects.reduce((sum, subj) => sum + subj.periods, 0);
  const remainingPeriods = totalPeriods - specialPeriodsUsed;
  
  if (remainingPeriods <= 0) {
    return [...processedSpecialSubjects, ...regularSubjects.map(subj => ({ 
      ...subj, 
      periods: 0,
      code: subj.code || generateShortName(subj.name)
    }))];
  }
  
  // Distribute remaining periods among regular subjects
  const totalOriginalRegularPeriods = regularSubjects.reduce((sum, subj) => sum + (subj.periods || 1), 0);
  
  let distributedPeriods = 0;
  const processedRegularSubjects = regularSubjects.map((subj, index) => {
    let periods: number;
    if (index === regularSubjects.length - 1) {
      // Last subject gets remaining periods
      periods = remainingPeriods - distributedPeriods;
    } else {
      const proportion = (subj.periods || 1) / totalOriginalRegularPeriods;
      periods = Math.round(proportion * remainingPeriods);
      distributedPeriods += periods;
    }
    return { 
      ...subj, 
      periods: clampPeriodCount(periods),
      code: subj.code || generateShortName(subj.name)
    };
  });
  
  return [...processedSpecialSubjects, ...processedRegularSubjects]
    .sort((a, b) => a.name.localeCompare(b.name));
}

// New function to count periods in generated timetable
export function countPeriodsInTimetable(timetable: string[][], subjectName: string): number {
  if (!timetable || !timetable.length || !subjectName) return 0;
  
  let count = 0;
  // Skip header row (index 0)
  for (let i = 1; i < timetable.length; i++) {
    const row = timetable[i];
    // Skip day column (index 0)
    for (let j = 1; j < row.length; j++) {
      const cell = row[j];
      if (cell && cell.trim() === subjectName.trim()) {
        count++;
      }
    }
  }
  return count;
}

// New function to validate period counts for all classes
export function validatePeriodCounts(
  classConfigs: any[],
  generatedTimetables: { name: string; table: string[][] }[]
): { className: string; subjectName: string; expectedPeriods: number; actualPeriods: number; isValid: boolean }[] {
  const validationResults: { className: string; subjectName: string; expectedPeriods: number; actualPeriods: number; isValid: boolean }[] = [];
  
  classConfigs.forEach(classConfig => {
    const generatedTimetable = generatedTimetables.find(t => t.name === classConfig.name);
    if (!generatedTimetable) return;
    
    classConfig.subjects.forEach((subject: any) => {
      const expectedPeriods = Number(subject.periods) || 0;
      const actualPeriods = countPeriodsInTimetable(generatedTimetable.table, subject.name);
      
      validationResults.push({
        className: classConfig.name,
        subjectName: subject.name,
        expectedPeriods,
        actualPeriods,
        isValid: expectedPeriods === actualPeriods
      });
    });
  });
  
  return validationResults;
}
