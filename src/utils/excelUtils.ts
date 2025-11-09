
import * as XLSX from "xlsx";
import { TableData, FacultySubjectDetails } from "@/types/downloadTypes";

// Generate faculty details worksheet
const generateFacultyDetailsSheet = (facultyDetails: FacultySubjectDetails[]) => {
  const facultyData = [
    ["S.NO", "SUB CODE", "SUBJECT NAME", "FACULTY NAME", "HOURS", "Contact No"],
    ...facultyDetails.map((detail, index) => [
      (index + 1).toString(),
      detail.subjectCode,
      detail.subjectName,
      detail.facultyName,
      detail.periodsPerWeek.toString(),
      detail.contactNumber || ""
    ])
  ];
  return XLSX.utils.aoa_to_sheet(facultyData);
};

// Generate combined class timetable with faculty details on same sheet
const generateCombinedClassSheet = (table: string[][], facultyDetails?: FacultySubjectDetails[]) => {
  const combinedData = [...table];
  
  // Add faculty details section if available
  if (facultyDetails && facultyDetails.length > 0) {
    // Add separator rows
    combinedData.push([]);
    combinedData.push(["FACULTY SUBJECT DETAILS"]);
    combinedData.push([]);
    
    // Add faculty details header
    combinedData.push(["S.NO", "SUB CODE", "SUBJECT NAME", "FACULTY NAME", "HOURS", "Contact No"]);
    
    // Add faculty details data
    facultyDetails.forEach((detail, index) => {
      combinedData.push([
        (index + 1).toString(),
        detail.subjectCode,
        detail.subjectName,
        detail.facultyName,
        detail.periodsPerWeek.toString(),
        detail.contactNumber || ""
      ]);
    });
  }
  
  return XLSX.utils.aoa_to_sheet(combinedData);
};

export const generateExcelIndividual = (items: TableData[], activeIdx: number, type: "class" | "teacher") => {
  if (!items?.length) return;
  const { name, table, facultyDetails } = items[activeIdx];
  
  const wb = XLSX.utils.book_new();
  
  if (type === "class") {
    // For class timetables, combine timetable and faculty details on same sheet
    const combinedWs = generateCombinedClassSheet(table, facultyDetails);
    XLSX.utils.book_append_sheet(wb, combinedWs, "Class Timetable & Faculty");
  } else {
    // For teacher timetables, just add the main timetable
    const ws = XLSX.utils.aoa_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
  }
  
  XLSX.writeFile(wb, `${name} (${type}).xlsx`);
};

export const generateExcelAllMerged = (items: TableData[], type: "class" | "teacher") => {
  if (!items?.length) return;
  const wb = XLSX.utils.book_new();
  
  items.forEach(({ name, table, facultyDetails }) => {
    const safeName = name.length > 30 ? name.slice(0, 30) : name;
    
    if (type === "class") {
      // For class timetables, combine timetable and faculty details on same sheet
      const combinedWs = generateCombinedClassSheet(table, facultyDetails);
      XLSX.utils.book_append_sheet(wb, combinedWs, safeName);
    } else {
      // For teacher timetables, just add the main timetable
      const ws = XLSX.utils.aoa_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    }
  });
  
  XLSX.writeFile(wb, `${type === "class" ? "All Classes" : "All Faculty"} Timetables.xlsx`);
};
