export interface UserDetails {
  academicYear: string;
  classTeacherName: string;
  sectionName: string;
  strength: string;
  lectureHall: string;
  contactNumber: string;
  collegeName: string;
  collegeAddress: string;
  websiteUrl: string;
  emailAddress: string;
  department: string;
  periodDuration: number; // in minutes
  collegeStartTime: string; // format: "HH:MM"
  principalName: string; // Global principal name
  hodName: string; // Default HOD name
  facultyName: string; // Add facultyName to the base interface
}

// New interface for individual class settings
export interface ClassUserDetails extends UserDetails {
  className: string;
  course: string;
  year: string;
  semester: string;
  // Individual settings that can be different per class
  department: string;
  emailAddress: string;
  hodName: string; // Individual HOD name per class
  facultyName: string; // Class-specific faculty name
}

// New interface for faculty subject details
export interface FacultySubjectDetails {
  facultyName: string;
  subjectName: string;
  subjectCode: string;
  periodsPerWeek: number;
  contactNumber?: string;
}

export interface TableData {
  name: string;
  table: string[][];
  facultyDetails?: FacultySubjectDetails[]; // Add faculty details to each timetable
}

export interface DownloadButtonProps {
  type: "class" | "teacher";
  items: TableData[];
  activeIdx?: number;
  disabled?: boolean;
  userDetails: UserDetails;
  classUserDetails?: Record<string, ClassUserDetails>;
}

export type CellType = "free" | "lab" | "special" | "lunch" | "normal" | "unfilled";

// New interface for period count validation
export interface PeriodCountValidation {
  className: string;
  subjectName: string;
  expectedPeriods: number;
  actualPeriods: number;
  isValid: boolean;
}
