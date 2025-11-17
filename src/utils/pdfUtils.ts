
import { jsPDF } from "jspdf";
import { UserDetails, TableData, ClassUserDetails, FacultySubjectDetails } from "@/types/downloadTypes";
import { getCellType, PDF_COLORS } from "@/utils/cellTypeUtils";
import { parseCourseDetails } from "@/utils/timetableHelpers";

// Generate time slots for PDF timing
const generateTimeSlots = (startTime: string, periodDuration: number, periodsPerDay: number) => {
  const timeSlots: string[] = [];
  let [hours, minutes] = startTime.split(':').map(Number);
  
  for (let p = 1; p <= periodsPerDay; p++) {
    const startHour = hours.toString().padStart(2, '0');
    const startMin = minutes.toString().padStart(2, '0');
    
    minutes += periodDuration;
    if (minutes >= 60) {
      hours += Math.floor(minutes / 60);
      minutes = minutes % 60;
    }
    
    const endHour = hours.toString().padStart(2, '0');
    const endMin = minutes.toString().padStart(2, '0');
    
    timeSlots.push(`${startHour}:${startMin}-${endHour}:${endMin}`);
  }
  
  return timeSlots;
};

// Generate faculty details table - compact version
const generateFacultyDetailsTable = (
  doc: jsPDF, 
  facultyDetails: FacultySubjectDetails[], 
  yPos: number
): number => {
  if (!facultyDetails || facultyDetails.length === 0) return yPos;

  // Add faculty details header
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Faculty Subject Details", 420, yPos, { align: "center" });
  yPos += 12;

  // Compact table headers
  const tableHeaders = ["S.NO", "SUB CODE", "SUBJECT NAME", "FACULTY NAME", "HOURS", "Contact No"];
  const colWidths = [30, 60, 160, 120, 40, 70]; // Reduced column widths
  let startX = 50;

  // Draw header row
  doc.setFillColor(220, 220, 220);
  let currentX = startX;
  tableHeaders.forEach((header, i) => {
    doc.rect(currentX, yPos - 10, colWidths[i], 12, "F");
    doc.setDrawColor(0, 0, 0);
    doc.rect(currentX, yPos - 10, colWidths[i], 12);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(header, currentX + 2, yPos - 3, { maxWidth: colWidths[i] - 4 });
    currentX += colWidths[i];
  });

  yPos += 6;

  // Draw data rows - compact
  facultyDetails.forEach((detail, index) => {
    currentX = startX;
    const rowData = [
      (index + 1).toString(),
      detail.subjectCode,
      detail.subjectName,
      detail.facultyName,
      detail.periodsPerWeek.toString(),
      detail.contactNumber || ""
    ];

    doc.setFillColor(255, 255, 255);
    rowData.forEach((data, i) => {
      doc.rect(currentX, yPos - 10, colWidths[i], 12, "F");
      doc.setDrawColor(0, 0, 0);
      doc.rect(currentX, yPos - 10, colWidths[i], 12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      // Truncate long text to fit
      const truncatedData = data.length > 25 ? data.substring(0, 22) + "..." : data;
      doc.text(truncatedData, currentX + 1, yPos - 3, { maxWidth: colWidths[i] - 2 });
      currentX += colWidths[i];
    });

    yPos += 12;
  });

  return yPos + 8;
};

export const generateEnhancedPDF = (
  itemName: string, 
  table: string[][], 
  userDetails: UserDetails, 
  type: "class" | "teacher",
  classUserDetails?: ClassUserDetails,
  facultyDetails?: FacultySubjectDetails[]
) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  // Use class-specific details if available, otherwise fall back to global
  const activeDetails = classUserDetails || userDetails;
  const courseDetails = classUserDetails ? 
    { course: classUserDetails.course, year: classUserDetails.year, sem: classUserDetails.semester } :
    parseCourseDetails(itemName);
  
  let yPos = 30; // Reduced top margin

  // Compact Institution Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(activeDetails.collegeName, 420, yPos, { align: "center" });
  yPos += 12;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(activeDetails.collegeAddress, 420, yPos, { align: "center" });
  yPos += 10;
  doc.text(`Mobile: +91 ${activeDetails.contactNumber}, Website: ${activeDetails.websiteUrl}, E-mail: ${activeDetails.emailAddress}`, 420, yPos, { align: "center" });
  yPos += 14;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(activeDetails.department, 420, yPos, { align: "center" });
  yPos += 18;

  // Compact Course Details Header
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const courseText = type === "class" ? `${courseDetails.course}/${courseDetails.year}/${courseDetails.sem}` : "All Classes";
  doc.text(`Course/Year/Sem: ${courseText}`, 40, yPos);
  doc.text(`Section: ${activeDetails.sectionName}`, 280, yPos);
  doc.text(`Academic Year: ${activeDetails.academicYear}`, 550, yPos);
  yPos += 10;
  
  const lectureHall = type === "class" ? activeDetails.lectureHall : "Multiple";
  const facultyName = type === "class" ? (classUserDetails?.facultyName || activeDetails.classTeacherName) : itemName;
  const strengthText = type === "class" ? activeDetails.strength : "All";
  doc.text(`Lecture Hall: ${lectureHall}`, 40, yPos);
  doc.text(`${type === "class" ? "Class Teacher" : "Faculty"}: ${facultyName}`, 280, yPos);
  doc.text(`Strength: ${strengthText}`, 550, yPos);
  yPos += 16;

  // Compact Timetable
  let rowHeight = 14; // Reduced row height
  let colX = 40;
  let totalWidth = 760; // Available width
  let colWidths = table[0].map(() => Math.floor(totalWidth / table[0].length));
  
  table.forEach((row, i) => {
    let cellX = colX;
    row.forEach((item, j) => {
      const cellType = getCellType(item);
      const isTimeSlot = j === 0;
      const isBreakLunch = item === "BREAK" || item === "LUNCH";
      
      // Set background color
      if (isTimeSlot) {
        doc.setFillColor("#ede9fe"); // purple-100 (theme adjusted)
      } else if (isBreakLunch) {
        doc.setFillColor("#fed7aa"); // orange-200
      } else {
        doc.setFillColor(PDF_COLORS[cellType] || "#fff");
      }
      
      doc.rect(cellX - 2, yPos + i * rowHeight - 10, colWidths[j], rowHeight, "F");
      doc.setDrawColor(100, 100, 100);
      doc.rect(cellX - 2, yPos + i * rowHeight - 10, colWidths[j], rowHeight);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(5); // Smaller font size
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      
      // Truncate long text
      const maxChars = Math.floor(colWidths[j] / 3);
      const truncatedItem = String(item).length > maxChars ? String(item).substring(0, maxChars - 3) + "..." : String(item);
      doc.text(truncatedItem, cellX + 1, yPos + i * rowHeight - 2, { maxWidth: colWidths[j] - 4 });
      cellX += colWidths[j];
    });
  });

  yPos += (table.length + 1) * rowHeight + 12;

  // Add faculty details table for class timetables - FIXED: Now includes faculty details
  if (type === "class" && facultyDetails && facultyDetails.length > 0) {
    yPos = generateFacultyDetailsTable(doc, facultyDetails, yPos);
  }

  // Compact Footer
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  
  const timeTableCoordinator = classUserDetails?.facultyName || activeDetails.classTeacherName;
  const hodName = classUserDetails?.hodName || activeDetails.hodName;
  const principalName = userDetails.principalName;
  
  doc.text(timeTableCoordinator, 120, yPos, { align: "center" });
  doc.text(hodName, 420, yPos, { align: "center" });
  doc.text(principalName, 680, yPos, { align: "center" });
  yPos += 10;
  doc.text("Time Table Coordinator", 120, yPos, { align: "center" });
  doc.text("HOD", 420, yPos, { align: "center" });
  doc.text("Principal", 680, yPos, { align: "center" });

  return doc;
};

export const generatePdfIndividual = (
  items: TableData[], 
  activeIdx: number, 
  type: "class" | "teacher", 
  userDetails: UserDetails,
  classUserDetails?: Record<string, ClassUserDetails>
) => {
  if (!items?.length) return;
  const { name, table, facultyDetails } = items[activeIdx];
  const classSpecificDetails = classUserDetails?.[name];
  const doc = generateEnhancedPDF(name, table, userDetails, type, classSpecificDetails, facultyDetails);
  doc.save(`${name} (${type}).pdf`);
};

export const generatePdfAllMerged = (
  items: TableData[], 
  type: "class" | "teacher", 
  userDetails: UserDetails,
  classUserDetails?: Record<string, ClassUserDetails>
) => {
  if (!items?.length) return;
  let doc: jsPDF | null = null;
  
  items.forEach(({ name, table, facultyDetails }, idx) => {
    const classSpecificDetails = classUserDetails?.[name];
    if (idx === 0) {
      doc = generateEnhancedPDF(name, table, userDetails, type, classSpecificDetails, facultyDetails);
    } else {
      doc!.addPage();
      const tempDoc = generateEnhancedPDF(name, table, userDetails, type, classSpecificDetails, facultyDetails);
      
      // Simplified page generation for merged PDF
      let yPos = 30;
      doc!.setFontSize(12);
      doc!.text(`${type === "class" ? "Class" : "Faculty"} Timetable: ${name}`, 40, yPos);
      yPos += 20;
      
      let rowHeight = 14;
      let colX = 40;
      let totalWidth = 760;
      let colWidths = table[0].map(() => Math.floor(totalWidth / table[0].length));

      table.forEach((row, i) => {
        let cellX = colX;
        row.forEach((item, j) => {
          const cellType = getCellType(item);
          doc!.setFillColor(PDF_COLORS[cellType] || "#fff");
          doc!.rect(cellX - 2, yPos + i * rowHeight - 10, colWidths[j], rowHeight, "F");
          doc!.setDrawColor(100, 100, 100);
          doc!.rect(cellX - 2, yPos + i * rowHeight - 10, colWidths[j], rowHeight);
          doc!.setTextColor(0, 0, 0);
          doc!.setFontSize(5);
          const maxChars = Math.floor(colWidths[j] / 3);
          const truncatedItem = String(item).length > maxChars ? String(item).substring(0, maxChars - 3) + "..." : String(item);
          doc!.text(truncatedItem, cellX + 1, yPos + i * rowHeight - 2, { maxWidth: colWidths[j] - 4 });
          cellX += colWidths[j];
        });
      });

      yPos += (table.length + 1) * rowHeight + 12;

      // Add faculty details table for class timetables
      if (type === "class" && facultyDetails && facultyDetails.length > 0) {
        yPos = generateFacultyDetailsTable(doc!, facultyDetails, yPos);
      }
    }
  });

  doc!.save(`${type === "class" ? "All Classes" : "All Faculty"} Timetables.pdf`);
};
