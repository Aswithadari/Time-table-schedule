/**
 * Utility for syncing teacher timetables when class timetables change
 */

/**
 * Regenerate teacher timetables from all class timetables
 */
export function regenerateTeacherTimetables(
  allClassTimetables: { className: string; timetable: any[][] }[],
  facultyData: any[]
): { teacher: string; timetable: any[][] }[] {
  // Create a map to track teacher schedules
  const teacherScheduleMap: Map<string, Map<string, Map<number, Array<{ className: string; subject: string }>>>> = new Map();
  
  // Extract all unique teachers
  const allTeachers = new Set<string>();
  facultyData.forEach(row => {
    const teacherName = row.Name || row.name || row.Teacher || row.teacher;
    if (teacherName) allTeachers.add(teacherName.trim());
  });
  
  // Initialize teacher schedule structure
  allTeachers.forEach(teacher => {
    const teacherMap = new Map<string, Map<number, Array<{ className: string; subject: string }>>>();
    teacherScheduleMap.set(teacher, teacherMap);
  });
  
  // Parse all class timetables and populate teacher schedules
  allClassTimetables.forEach(({ className, timetable }) => {
    if (!timetable || timetable.length === 0) return;
    
    // Get day labels from first column (skip header row)
    const days = timetable.slice(1).map(row => row[0]);
    
    // Get period labels from header row (skip first column which is "Day")
    const periods = timetable[0].slice(1);
    
    // Parse each cell
    days.forEach((day, dayIndex) => {
      periods.forEach((periodLabel, periodIndex) => {
        const cellContent = timetable[dayIndex + 1][periodIndex + 1];
        if (!cellContent || cellContent === '-' || cellContent === 'Free') return;
        
        // Extract subject name (remove lab suffix)
        const subject = cellContent.replace(' (Lab)', '').trim();
        
        // Find teacher for this subject in this class
        const teacher = findTeacherForSubject(subject, className, facultyData);
        if (!teacher) return;
        
        // Add to teacher schedule
        if (!teacherScheduleMap.has(teacher)) {
          teacherScheduleMap.set(teacher, new Map());
        }
        
        const teacherDayMap = teacherScheduleMap.get(teacher)!;
        if (!teacherDayMap.has(day)) {
          teacherDayMap.set(day, new Map());
        }
        
        const teacherPeriodMap = teacherDayMap.get(day)!;
        const period = parseInt(periodLabel.replace('P', ''));
        if (!teacherPeriodMap.has(period)) {
          teacherPeriodMap.set(period, []);
        }
        
        teacherPeriodMap.get(period)!.push({ className, subject });
      });
    });
  });
  
  // Convert teacher schedules to timetable format
  const teacherTimetables: { teacher: string; timetable: any[][] }[] = [];
  
  teacherScheduleMap.forEach((dayMap, teacher) => {
    // Find max periods across all days
    let maxPeriods = 0;
    const allDays: string[] = [];
    
    dayMap.forEach((periodMap, day) => {
      if (!allDays.includes(day)) allDays.push(day);
      periodMap.forEach((_, period) => {
        if (period > maxPeriods) maxPeriods = period;
      });
    });
    
    // Sort days
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    allDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    // Create timetable header
    const header = ['Day'];
    for (let p = 1; p <= maxPeriods; p++) {
      header.push(`P${p}`);
    }
    
    const timetable = [header];
    
    // Create rows for each day
    allDays.forEach(day => {
      const row = [day];
      const periodMap = dayMap.get(day) || new Map();
      
      for (let p = 1; p <= maxPeriods; p++) {
        const assignments = periodMap.get(p) || [];
        if (assignments.length === 0) {
          row.push('Free');
        } else if (assignments.length === 1) {
          row.push(`${assignments[0].className} - ${assignments[0].subject}`);
        } else {
          // Multiple classes (combined)
          const classNames = assignments.map(a => a.className).join('+');
          row.push(`${classNames} - ${assignments[0].subject}`);
        }
      }
      
      timetable.push(row);
    });
    
    teacherTimetables.push({ teacher, timetable });
  });
  
  // Sort by teacher name
  teacherTimetables.sort((a, b) => a.teacher.localeCompare(b.teacher));
  
  return teacherTimetables;
}

/**
 * Find teacher for a subject in a specific class
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
 * Update a specific class timetable and regenerate teacher timetables
 */
export function updateClassTimetableAndSync(
  updatedClassTimetable: { className: string; timetable: any[][] },
  allClassTimetables: { className: string; timetable: any[][] }[],
  facultyData: any[]
): {
  updatedClassTimetables: { className: string; timetable: any[][] }[];
  updatedTeacherTimetables: { teacher: string; timetable: any[][] }[];
} {
  // Update the class timetable in the array
  const updatedClassTimetables = allClassTimetables.map(ct => 
    ct.className === updatedClassTimetable.className ? updatedClassTimetable : ct
  );
  
  // Regenerate teacher timetables
  const updatedTeacherTimetables = regenerateTeacherTimetables(updatedClassTimetables, facultyData);
  
  return {
    updatedClassTimetables,
    updatedTeacherTimetables
  };
}
