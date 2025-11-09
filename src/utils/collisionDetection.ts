/**
 * Collision detection utility for timetable drag-and-drop operations
 */

export interface CollisionResult {
  hasCollision: boolean;
  collisions: CollisionInfo[];
  canProceed: boolean;
}

export interface CollisionInfo {
  type: 'teacher' | 'lab';
  teacherName?: string;
  labName?: string;
  conflictingClasses: string[];
  day: string;
  period: number;
  message: string;
}

/**
 * Check for teacher collisions when moving a subject to a new slot
 */
export function checkTeacherCollision(
  subjectName: string,
  teacherName: string,
  targetDay: string,
  targetPeriod: number,
  currentClassName: string,
  allClassTimetables: { className: string; timetable: any[][] }[],
  facultyData: any[]
): CollisionResult {
  const collisions: CollisionInfo[] = [];
  
  // Find all classes that have the same teacher at the target slot
  allClassTimetables.forEach(({ className, timetable }) => {
    if (className === currentClassName) return; // Skip current class
    
    // Parse timetable to find if this teacher is scheduled at the target slot
    const dayIndex = timetable.findIndex((row, idx) => idx > 0 && row[0] === targetDay);
    if (dayIndex === -1) return;
    
    const periodIndex = targetPeriod + 1; // +1 for header column
    if (periodIndex >= timetable[dayIndex].length) return;
    
    const cellContent = timetable[dayIndex][periodIndex];
    if (!cellContent || cellContent === '-' || cellContent === 'Free') return;
    
    // Check if this subject has the same teacher
    const cellSubject = cellContent.replace(' (Lab)', '').trim();
    const cellTeacher = findTeacherForSubject(cellSubject, className, facultyData);
    
    if (cellTeacher && cellTeacher === teacherName) {
      collisions.push({
        type: 'teacher',
        teacherName,
        conflictingClasses: [className],
        day: targetDay,
        period: targetPeriod,
        message: `Teacher ${teacherName} is already teaching ${cellSubject} in ${className} at ${targetDay} P${targetPeriod}`
      });
    }
  });
  
  return {
    hasCollision: collisions.length > 0,
    collisions,
    canProceed: collisions.length === 0
  };
}

/**
 * Check for lab room collisions when moving a lab subject
 */
export function checkLabCollision(
  subjectName: string,
  targetDay: string,
  targetPeriod: number,
  currentClassName: string,
  allClassTimetables: { className: string; timetable: any[][] }[],
  labResources: any[]
): CollisionResult {
  const collisions: CollisionInfo[] = [];
  
  // Find which lab room this subject uses
  const subjectLab = labResources.find(lab => 
    lab.subjects.includes(subjectName) || lab.subjects.includes(subjectName + ' (Lab)')
  );
  
  if (!subjectLab) {
    return { hasCollision: false, collisions: [], canProceed: true };
  }
  
  // Check all other classes for the same lab at the target slot
  allClassTimetables.forEach(({ className, timetable }) => {
    if (className === currentClassName) return;
    
    const dayIndex = timetable.findIndex((row, idx) => idx > 0 && row[0] === targetDay);
    if (dayIndex === -1) return;
    
    const periodIndex = targetPeriod + 1;
    if (periodIndex >= timetable[dayIndex].length) return;
    
    const cellContent = timetable[dayIndex][periodIndex];
    if (!cellContent || !cellContent.includes('(Lab)')) return;
    
    const cellSubject = cellContent.replace(' (Lab)', '').trim();
    const cellLab = labResources.find(lab => 
      lab.subjects.includes(cellSubject) || lab.subjects.includes(cellContent)
    );
    
    if (cellLab && cellLab.name === subjectLab.name) {
      collisions.push({
        type: 'lab',
        labName: subjectLab.name,
        conflictingClasses: [className],
        day: targetDay,
        period: targetPeriod,
        message: `Lab ${subjectLab.name} is already occupied by ${className} at ${targetDay} P${targetPeriod}`
      });
    }
  });
  
  return {
    hasCollision: collisions.length > 0,
    collisions,
    canProceed: collisions.length === 0
  };
}

/**
 * Find teacher for a given subject and class
 */
function findTeacherForSubject(
  subjectName: string,
  className: string,
  facultyData: any[]
): string | null {
  const cleanSubject = subjectName.replace(' (Lab)', '').trim();
  
  for (const row of facultyData) {
    const classField = row.Classes || row.Class || row.classes || row.class || '';
    const subjectField = row.Subject || row.subject || row.Subjects || row.subjects || '';
    const teacherField = row.Name || row.name || row.Teacher || row.teacher || '';
    
    if (!classField || !subjectField || !teacherField) continue;
    
    const classNames = classField.includes(',') 
      ? classField.split(',').map((c: string) => c.trim())
      : [classField.trim()];
    
    if (classNames.includes(className) && 
        subjectField.trim().toLowerCase() === cleanSubject.toLowerCase()) {
      return teacherField.trim();
    }
  }
  
  return null;
}

/**
 * Combined collision check for both teacher and lab
 */
export function checkAllCollisions(
  subjectName: string,
  teacherName: string,
  targetDay: string,
  targetPeriod: number,
  currentClassName: string,
  allClassTimetables: { className: string; timetable: any[][] }[],
  facultyData: any[],
  labResources: any[]
): CollisionResult {
  const teacherResult = checkTeacherCollision(
    subjectName,
    teacherName,
    targetDay,
    targetPeriod,
    currentClassName,
    allClassTimetables,
    facultyData
  );
  
  const labResult = checkLabCollision(
    subjectName,
    targetDay,
    targetPeriod,
    currentClassName,
    allClassTimetables,
    labResources
  );
  
  return {
    hasCollision: teacherResult.hasCollision || labResult.hasCollision,
    collisions: [...teacherResult.collisions, ...labResult.collisions],
    canProceed: teacherResult.canProceed && labResult.canProceed
  };
}
