import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, closestCenter } from "@dnd-kit/core";
import { DraggableTimetableCell } from "./DraggableTimetableCell";
import DownloadButton from "./ui/DownloadButton";
import TableCellColor from "./ui/TableCellColor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Settings, Clock, User, CheckCircle, XCircle, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { parseCourseDetails, validatePeriodCounts } from "@/utils/timetableHelpers";
import { getCellType } from "@/utils/cellTypeUtils";
import { ClassUserDetails, FacultySubjectDetails } from "@/types/downloadTypes";
import { generateTimetables } from "@/utils/timetableGenerator";
import { checkAllCollisions, CollisionResult } from "@/utils/collisionDetection";
import { regenerateTeacherTimetables } from "@/utils/teacherTimetableSync";

type TimetableTabsProps = {
  timetables: {
    classes: { name: string; table: string[][]; facultyDetails?: FacultySubjectDetails[] }[];
    teachers: { name: string; table: string[][] }[];
    errors?: string[];
    needsRegeneration?: boolean;
  };
  onRestart: () => void;
  config: any;
  facultyData?: any[];
  labResources?: any[];
  classCapacities?: any[];
};

// Extract contact number from faculty data
const extractContactNumber = (facultyData: any[]): string => {
  if (!facultyData?.length) return "";
  
  const contactFields = ['contact', 'contactno', 'contact_no', 'phone', 'mobile', 'contactnumber'];
  
  for (const row of facultyData) {
    for (const field of contactFields) {
      const contactValue = row[field] || row[field.toLowerCase()] || row[field.toUpperCase()];
      if (contactValue && contactValue.toString().trim()) {
        return contactValue.toString().trim();
      }
    }
  }
  
  return "";
};

// Check if timetable has free periods
const hasFreePeriods = (timetables: any): boolean => {
  if (!timetables.classes) return false;
  
  for (const classItem of timetables.classes) {
    for (let i = 1; i < classItem.table.length; i++) {
      for (let j = 1; j < classItem.table[i].length; j++) {
        const cell = classItem.table[i][j];
        if (getCellType(cell) === 'free') {
          return true;
        }
      }
    }
  }
  return false;
};

// Generate time slots based on start time and period duration
const generateTimeSlots = (startTime: string, periodDuration: number, periodsPerDay: number) => {
  const timeSlots: string[] = [];
  let [hours, minutes] = startTime.split(':').map(Number);
  
  for (let p = 1; p <= periodsPerDay; p++) {
    const startHour = hours.toString().padStart(2, '0');
    const startMin = minutes.toString().padStart(2, '0');
    
    // Calculate end time
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

const TimetableTabs = ({ timetables, onRestart, config, facultyData, labResources, classCapacities }: TimetableTabsProps) => {
  const [tab, setTab] = useState<"class" | "teacher">("class");
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("global");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentTimetables, setCurrentTimetables] = useState(timetables);
  
  const extractedContact = extractContactNumber(facultyData || []);
  const defaultContact = extractedContact || "9994766181";
  
  // Global user details with updated default college name
  const [userDetails, setUserDetails] = useState({
    academicYear: "2024-2025",
    classTeacherName: "Faculty Name",
    sectionName: "CSM-A/CSM-B", 
    strength: "78",
    lectureHall: "38",
    contactNumber: defaultContact,
    collegeName: "Centurion University",
    collegeAddress: "Ramchandrapur, Jatni, Bhubaneswar, Odisha - 752050",
    websiteUrl: "www.cutm.ac.in",
    emailAddress: "hod.csdm@diet.edu.in",
    department: "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING(CSM&CSD)",
    periodDuration: 50,
    collegeStartTime: "09:00",
    principalName: "Dr. R. Vaikunta Rao",
    hodName: "HOD-CSM/CSD",
    facultyName: "Faculty Name"
  });

  // Individual class settings
  const [classUserDetails, setClassUserDetails] = useState<Record<string, ClassUserDetails>>({});

  // Period count validation
  const [periodValidation, setPeriodValidation] = useState<{ className: string; subjectName: string; expectedPeriods: number; actualPeriods: number; isValid: boolean }[]>([]);
  
  // Drag and drop state
  const [activeDragItem, setActiveDragItem] = useState<{ day: string; period: number; subject: string; className: string } | null>(null);
  
  // Configure DnD sensors with optimized settings for faster drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8px for faster activation
        delay: 0,
        tolerance: 5
      },
    })
  );

  // Background regeneration function
  const handleBackgroundRegeneration = useCallback(async () => {
    if (!config || isRegenerating) return;
    
    console.log("Starting background regeneration...");
    setIsRegenerating(true);
    
    try {
      // Regenerate with same config but incremented count
      const regenerationConfig = {
        ...config,
        regenerationCount: (config.regenerationCount || 0) + 1,
        maxRegenerations: 50
      };
      
      const newTimetables = generateTimetables(regenerationConfig, facultyData || []);
      
      if (newTimetables && !newTimetables.needsRegeneration && !hasFreePeriods(newTimetables)) {
        console.log("Background regeneration successful - no free periods");
        setCurrentTimetables(newTimetables);
      } else if (newTimetables.canRegenerate || hasFreePeriods(newTimetables)) {
        // Continue regenerating if still needed and within limits
        setTimeout(() => {
          const nextConfig = { ...regenerationConfig, regenerationCount: regenerationConfig.regenerationCount + 1 };
          handleBackgroundRegeneration();
        }, 1000);
      }
    } catch (error) {
      console.error("Background regeneration failed:", error);
    } finally {
      setIsRegenerating(false);
    }
  }, [config, facultyData, isRegenerating]);

  // Initialize class-specific settings with enhanced details and lecture halls from config
  useEffect(() => {
    if (currentTimetables.classes.length > 0) {
      const newClassDetails: Record<string, ClassUserDetails> = {};
      currentTimetables.classes.forEach(classItem => {
        const courseDetails = parseCourseDetails(classItem.name);
        // Get lecture hall from config if available
        const classConfig = config?.classes?.find((c: any) => c.name === classItem.name);
        const lectureHall = classConfig?.lectureHall || `LH-${classItem.name}`;
        
        newClassDetails[classItem.name] = {
          ...userDetails,
          className: classItem.name,
          course: courseDetails.course,
          year: courseDetails.year,
          semester: courseDetails.sem,
          lectureHall: lectureHall,
          // Default individual settings
          department: "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING(CSM&CSD)",
          emailAddress: "hod.csdm@diet.edu.in",
          hodName: "HOD-CSM/CSD",
          facultyName: "Faculty Name"
        };
      });
      setClassUserDetails(newClassDetails);
    }
  }, [currentTimetables.classes, userDetails, config]);

  // Validate period counts when timetables change
  useEffect(() => {
    if (config?.classes && currentTimetables.classes.length > 0) {
      const validation = validatePeriodCounts(config.classes, currentTimetables.classes);
      setPeriodValidation(validation);
    }
  }, [config, currentTimetables.classes]);

  // Update contact number when faculty data changes
  useEffect(() => {
    const newContact = extractContactNumber(facultyData || []);
    if (newContact) {
      setUserDetails(prev => ({ ...prev, contactNumber: newContact }));
    }
  }, [facultyData]);

  // Handle background regeneration when needed or when free periods are detected
  useEffect(() => {
    if ((currentTimetables.needsRegeneration || hasFreePeriods(currentTimetables)) && config?.classes && !isRegenerating) {
      console.log("Triggering background regeneration for period validation or free periods");
      setTimeout(() => {
        handleBackgroundRegeneration();
      }, 2000);
    }
  }, [currentTimetables.needsRegeneration, config, handleBackgroundRegeneration, isRegenerating, currentTimetables]);

  // Update current timetables when props change
  useEffect(() => {
    setCurrentTimetables(timetables);
  }, [timetables]);

  const items = tab === "class" ? currentTimetables.classes : currentTimetables.teachers;
  const hasErrors = currentTimetables.errors && currentTimetables.errors.length > 0;

  // Update individual class settings with real-time updates
  const updateClassDetails = (className: string, field: string, value: string) => {
    setClassUserDetails(prev => {
      const updated = {
        ...prev,
        [className]: {
          ...prev[className],
          [field]: value
        }
      };
      
      // If lecture hall is updated, trigger real-time update
      if (field === 'lectureHall') {
        console.log(`Real-time update: Lecture hall for ${className} changed to ${value}`);
        
        // Update config immediately
        if (config?.classes) {
          const updatedClasses = config.classes.map((c: any) => 
            c.name === className ? { ...c, lectureHall: value } : c
          );
          config.classes = updatedClasses;
        }
        
        // Force re-render to show updated lecture hall in timetable
        setCurrentTimetables(prev => ({ ...prev }));
        
        toast.success(`Lecture hall updated to ${value} for ${className}`);
      }
      
      return updated;
    });
  };
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    
    if (data) {
      setActiveDragItem({
        day: data.day,
        period: data.period,
        subject: data.subject,
        className: data.className
      });
    }
  };
  
  // Validate lab collision before drop
  const validateLabCollision = (
    sourceSubject: string,
    targetSubject: string,
    sourceDay: string,
    sourcePeriod: number,
    targetDay: string,
    targetPeriod: number,
    currentClassName: string
  ): { isValid: boolean; error?: string } => {
    // Check if either subject is a lab
    const sourceIsLab = sourceSubject.includes('(Lab)');
    const targetIsLab = targetSubject.includes('(Lab)');
    
    if (!sourceIsLab && !targetIsLab) {
      return { isValid: true };
    }
    
    // Get lab names if applicable
    const getLabName = (subject: string, day: string, period: number) => {
      // Find the lab in global schedule
      // This would need access to lab resources and global lab schedule
      // For now, we'll check if the lab name matches
      return subject.replace(' (Lab)', '');
    };
    
    // Check if swapping would cause collision
    // We need to verify that the target location doesn't have another class using the same lab
    const targetLabSubject = targetIsLab ? targetSubject.replace(' (Lab)', '') : null;
    const sourceLabSubject = sourceIsLab ? sourceSubject.replace(' (Lab)', '') : null;
    
    // If both are labs, ensure they're for different subjects or same class
    if (sourceIsLab && targetIsLab) {
      if (sourceLabSubject !== targetLabSubject) {
        return { 
          isValid: false, 
          error: `Cannot swap different lab subjects. This would create a lab collision.` 
        };
      }
    }
    
    return { isValid: true };
  };
  
  // Handle drag end with collision detection and teacher timetable regeneration
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragItem(null);
    
    if (!over || !active.data.current || !over.data.current) {
      return;
    }
    
    const sourceData = active.data.current;
    const targetData = over.data.current;
    
    // Can't drop on itself
    if (sourceData.day === targetData.day && sourceData.period === targetData.period) {
      return;
    }
    
    // Can't drop on break/lunch
    if (targetData.isBreakLunch) {
      toast.error("Cannot drop on break/lunch period");
      return;
    }
    
    const currentClassName = sourceData.className;
    const classIndex = currentTimetables.classes.findIndex(c => c.name === currentClassName);
    
    if (classIndex === -1) return;
    
    // Find rows for source and target
    const sourceRow = currentTimetables.classes[classIndex].table.findIndex(row => row[0] === sourceData.day);
    const targetRow = currentTimetables.classes[classIndex].table.findIndex(row => row[0] === targetData.day);
    
    if (sourceRow === -1 || targetRow === -1) return;
    
    const sourceSubject = currentTimetables.classes[classIndex].table[sourceRow][sourceData.period];
    const targetSubject = currentTimetables.classes[classIndex].table[targetRow][targetData.period];
    
    // Find teacher for source subject
    const cleanSourceSubject = sourceSubject.replace(' (Lab)', '').trim();
    const sourceTeacher = facultyData?.find(row => {
      const classField = row.Classes || row.Class || row.classes || row.class || '';
      const subjectField = row.Subject || row.subject || row.Subjects || row.subjects || '';
      const classNames = classField.includes(',') ? classField.split(',').map((c: string) => c.trim()) : [classField.trim()];
      return classNames.includes(currentClassName) && subjectField.trim().toLowerCase() === cleanSourceSubject.toLowerCase();
    });
    
    const teacherName = sourceTeacher ? (sourceTeacher.Name || sourceTeacher.name || sourceTeacher.Teacher || sourceTeacher.teacher) : '';
    
    // Check for collisions at target location
    const collisionResult: CollisionResult = checkAllCollisions(
      cleanSourceSubject,
      teacherName,
      targetData.day,
      targetData.period,
      currentClassName,
      currentTimetables.classes.map(c => ({ className: c.name, timetable: c.table })),
      facultyData || [],
      labResources || []
    );
    
    if (collisionResult.hasCollision) {
      // Show collision details
      const collisionMessages = collisionResult.collisions.map(c => c.message).join('\n');
      const conflictingClasses = [...new Set(collisionResult.collisions.flatMap(c => c.conflictingClasses))];
      
      toast.error(
        `Collision detected!\n${collisionMessages}\n\nConflicting classes: ${conflictingClasses.join(', ')}`,
        { duration: 5000 }
      );
      return;
    }
    
    // Swap periods in class timetable
    const updatedClasses = [...currentTimetables.classes];
    updatedClasses[classIndex].table[sourceRow][sourceData.period] = targetSubject;
    updatedClasses[classIndex].table[targetRow][targetData.period] = sourceSubject;
    
    // Regenerate teacher timetables from updated class timetables
    const updatedTeachers = regenerateTeacherTimetables(
      updatedClasses.map(c => ({ className: c.name, timetable: c.table })),
      facultyData || []
    );
    
    // Update state
    setCurrentTimetables({
      ...currentTimetables,
      classes: updatedClasses,
      teachers: updatedTeachers.map(t => ({ name: t.teacher, table: t.timetable }))
    });
    
    toast.success("Periods swapped successfully");
  };

  // Enhanced table component with faculty details and timing - optimized for PDF
  const renderEnhancedTable = (tableData: string[][], itemName: string, facultyDetails?: FacultySubjectDetails[]) => {
    if (!tableData || tableData.length === 0) return null;

    const courseDetails = parseCourseDetails(itemName);
    const classDetails = classUserDetails[itemName] || userDetails;
    const periodsPerDay = tableData[0].length - 1; // Subtract 1 for day column
    const timeSlots = generateTimeSlots(userDetails.collegeStartTime, userDetails.periodDuration, periodsPerDay);
    
    return (
      <div className="w-full space-y-4">
        {/* Main Timetable - Optimized for PDF printing */}
        <div className="w-full bg-white border-2 border-gray-800 overflow-hidden" style={{ fontSize: '8px', maxWidth: '210mm', transform: 'scale(0.85)', transformOrigin: 'top left' }}>
          {/* Institution Header - Customizable */}
          <div className="bg-gray-100 border-b-2 border-gray-800 p-1 text-center">
            <div className="text-xs font-bold text-gray-800 mb-1">
              {userDetails.collegeName}
            </div>
            <div className="text-xs text-gray-600 mb-1">
              {userDetails.collegeAddress}
            </div>
            <div className="text-xs text-gray-600 mb-1">
              Mobile: +91 {userDetails.contactNumber}, Website: {userDetails.websiteUrl}, E-mail: {classDetails.emailAddress}
            </div>
            
            <div className="border-t border-gray-400 pt-1">
              <div className="text-xs font-bold text-gray-800">
                {classDetails.department}
              </div>
            </div>
          </div>

          {/* Course Details Header */}
          <div className="bg-yellow-100 border-b-2 border-gray-800 p-1">
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div>
                <span className="font-semibold">Course/Year/Sem:</span> {tab === "class" ? `${courseDetails.course}/${courseDetails.year}/${courseDetails.sem}` : "All Classes"}
              </div>
              <div className="text-center">
                <span className="font-semibold">Section:</span> {classDetails.sectionName}
              </div>
              <div className="text-right">
                <span className="font-semibold">Academic Year:</span> {userDetails.academicYear}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1 text-xs mt-1">
              <div>
                <span className="font-semibold">Lecture Hall:</span> {tab === "class" ? classDetails.lectureHall : "Multiple"}
              </div>
              <div className="text-center">
                <span className="font-semibold">{tab === "class" ? "Class Teacher" : "Faculty"}:</span> {tab === "class" ? (classDetails.facultyName || classDetails.classTeacherName) : itemName}
              </div>
              <div className="text-right">
                <span className="font-semibold">Strength:</span> {tab === "class" ? classDetails.strength : "All"}
              </div>
            </div>
          </div>

          {/* Compact Timetable */}
          <Table className="border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-gray-200 border-b-2 border-gray-800">
                {tableData[0]?.map((header, i) => (
                  <TableHead 
                    key={i} 
                    className="border-2 border-gray-800 px-1 py-1 text-center font-bold text-gray-800 text-xs h-6"
                    style={{ minWidth: i === 0 ? '50px' : '70px', maxWidth: i === 0 ? '50px' : '100px' }}
                  >
                    <div className="truncate text-xs">
                      {i === 0 ? header : `P${i}`}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.slice(1).map((row, i) => (
                <TableRow key={i} className="border-b border-gray-800 h-8">
                  {row.map((cell, j) => {
                    const isTimeSlot = j === 0;
                    const isBreakLunch = cell === "BREAK" || cell === "LUNCH";
                    const dayName = row[0];
                    const isDraggable = !isTimeSlot && !isBreakLunch && tab === 'class';
                    
                    return (
                      <DraggableTimetableCell
                        key={j}
                        cell={cell}
                        day={dayName}
                        period={j}
                        className={itemName}
                        isTimeSlot={isTimeSlot}
                        isBreakLunch={isBreakLunch}
                        isDraggable={isDraggable}
                      />
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Footer with coordinator details */}
          <div className="bg-gray-100 border-t-2 border-gray-800 p-1">
            <div className="grid grid-cols-3 gap-1 text-xs text-center">
              <div>
                <div className="font-semibold text-xs">{classDetails.facultyName || classDetails.classTeacherName}</div>
                <div className="font-semibold mt-1 text-xs">Time Table Coordinator</div>
              </div>
              <div>
                <div className="font-semibold text-xs">{classDetails.hodName}</div>
                <div className="font-semibold mt-1 text-xs">HOD</div>
              </div>
              <div>
                <div className="font-semibold text-xs">{userDetails.principalName}</div>
                <div className="font-semibold mt-1 text-xs">Principal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Details Table */}
        {tab === "class" && facultyDetails && facultyDetails.length > 0 && (
          <div className="w-full bg-white border-2 border-gray-800 overflow-hidden" style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
            <div className="bg-gray-100 border-b-2 border-gray-800 p-2 text-center">
              <div className="text-sm font-bold text-gray-800 flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Faculty Subject Details
              </div>
            </div>
            <Table className="border-collapse text-xs">
              <TableHeader>
                <TableRow className="bg-gray-200 border-b-2 border-gray-800">
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">S.NO</TableHead>
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">SUB CODE</TableHead>
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">SUBJECT NAME</TableHead>
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">FACULTY NAME</TableHead>
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">HOURS</TableHead>
                  <TableHead className="border-2 border-gray-800 px-2 py-1 text-center font-bold text-gray-800 text-xs">Contact No</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyDetails.map((detail, index) => (
                  <TableRow key={index} className="border-b border-gray-800">
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-center text-xs">{index + 1}</TableCell>
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-center text-xs">{detail.subjectCode}</TableCell>
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-left text-xs">{detail.subjectName}</TableCell>
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-left text-xs">{detail.facultyName}</TableCell>
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-center text-xs">{detail.periodsPerWeek}</TableCell>
                    <TableCell className="border-2 border-gray-800 px-2 py-1 text-center text-xs">{detail.contactNumber || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        {/* Remove error display from main screen - only show regeneration status */}
        {isRegenerating && (
        <Alert className="mb-4 border-teal-200 bg-teal-50">
          <Clock className="h-4 w-4" />
          <AlertTitle>Regenerating Timetables</AlertTitle>
          <AlertDescription>
            The system is automatically regenerating timetables to eliminate free periods and optimize period distribution. This process will continue until the optimal solution is found.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex gap-2 items-end">
          {/* Tab Switch */}
          <button className={tab === "class" ? "font-bold" : "text-muted-foreground"} onClick={() => setTab("class")}>
            Class Timetables
          </button>
          <span className="text-muted-foreground">|</span>
          <button className={tab === "teacher" ? "font-bold" : "text-muted-foreground"} onClick={() => setTab("teacher")}>
            Teacher Timetables
          </button>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <DownloadButton 
            type={tab} 
            items={items} 
            activeIdx={activeIdx} 
            userDetails={userDetails}
            classUserDetails={classUserDetails}
          />
        </div>
      </div>

      {/* Enhanced Settings Panel with Tabs */}
      {showSettings && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Timetable Customization
          </h3>
          
          <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">Global Settings</TabsTrigger>
              <TabsTrigger value="individual">Individual Classes</TabsTrigger>
              <TabsTrigger value="validation">Period Validation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="global" className="mt-4">
              {/* College Information Section */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">College Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collegeName">College Name</Label>
                    <Input
                      id="collegeName"
                      value={userDetails.collegeName}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, collegeName: e.target.value }))}
                      placeholder="College Name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="collegeAddress">College Address</Label>
                    <Input
                      id="collegeAddress"
                      value={userDetails.collegeAddress}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, collegeAddress: e.target.value }))}
                      placeholder="College Address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      value={userDetails.websiteUrl}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      placeholder="www.college.edu"
                    />
                  </div>
                </div>
              </div>
              
              {/* Timing Configuration Section */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timing Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collegeStartTime">College Start Time</Label>
                    <Input
                      id="collegeStartTime"
                      type="time"
                      value={userDetails.collegeStartTime}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, collegeStartTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodDuration">Period Duration (minutes)</Label>
                    <Input
                      id="periodDuration"
                      type="number"
                      min="30"
                      max="90"
                      value={userDetails.periodDuration}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, periodDuration: parseInt(e.target.value) || 50 }))}
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
              
              {/* Class Details Section */}
              <div>
                <h4 className="font-medium mb-2">Default Class Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input
                      id="academicYear"
                      value={userDetails.academicYear}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, academicYear: e.target.value }))}
                      placeholder="2024-2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="classTeacher">Class Teacher Name</Label>
                    <Input
                      id="classTeacher"
                      value={userDetails.classTeacherName}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, classTeacherName: e.target.value }))}
                      placeholder="Faculty Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">Section Name</Label>
                    <Input
                      id="section"
                      value={userDetails.sectionName}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, sectionName: e.target.value }))}
                      placeholder="CSM-A/CSM-B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="strength">Class Strength</Label>
                    <Input
                      id="strength"
                      value={userDetails.strength}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, strength: e.target.value }))}
                      placeholder="78"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lectureHall">Lecture Hall</Label>
                    <Input
                      id="lectureHall"
                      value={userDetails.lectureHall}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, lectureHall: e.target.value }))}
                      placeholder="38"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={userDetails.contactNumber}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, contactNumber: e.target.value }))}
                      placeholder="9994766181"
                    />
                  </div>
                </div>
              </div>
              
              {/* Authority Names Section */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Authority Names</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="principalName">Principal Name (Global)</Label>
                    <Input
                      id="principalName"
                      value={userDetails.principalName}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, principalName: e.target.value }))}
                      placeholder="Dr. Principal Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hodName">Default HOD Name</Label>
                    <Input
                      id="hodName"
                      value={userDetails.hodName}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, hodName: e.target.value }))}
                      placeholder="HOD-CSM/CSD"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="individual" className="mt-4">
              <div className="space-y-6">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Individual Class Settings
                </h4>
                
                {currentTimetables.classes.map((classItem) => (
                  <div key={classItem.name} className="border rounded-lg p-4 bg-white">
                    <h5 className="font-medium mb-3">{classItem.name}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Course</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.course || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "course", e.target.value)}
                          placeholder="B.Tech CSE"
                        />
                      </div>
                      <div>
                        <Label>Year</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.year || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "year", e.target.value)}
                          placeholder="I"
                        />
                      </div>
                      <div>
                        <Label>Semester</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.semester || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "semester", e.target.value)}
                          placeholder="I"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Department</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.department || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "department", e.target.value)}
                          placeholder="DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING"
                        />
                      </div>
                      <div>
                        <Label>Email Address</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.emailAddress || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "emailAddress", e.target.value)}
                          placeholder="hod.csdm@diet.edu.in"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Class Teacher</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.classTeacherName || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "classTeacherName", e.target.value)}
                          placeholder="Faculty Name"
                        />
                      </div>
                      <div>
                        <Label>Section</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.sectionName || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "sectionName", e.target.value)}
                          placeholder="CSM-A"
                        />
                      </div>
                      <div>
                        <Label>Class Strength</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.strength || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "strength", e.target.value)}
                          placeholder="78"
                        />
                      </div>
                      <div>
                        <Label>Lecture Hall</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.lectureHall || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "lectureHall", e.target.value)}
                          placeholder="38"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>HOD Name</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.hodName || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "hodName", e.target.value)}
                          placeholder="HOD-CSM/CSD"
                        />
                      </div>
                      <div>
                        <Label>Faculty Name</Label>
                        <Input
                          value={classUserDetails[classItem.name]?.facultyName || ""}
                          onChange={(e) => updateClassDetails(classItem.name, "facultyName", e.target.value)}
                          placeholder="Faculty Name"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="validation" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Period Count Validation & Error Display</h4>
                <p className="text-sm text-gray-600">Compare expected periods vs actual periods in generated timetables. All errors are shown here instead of the main screen.</p>
                
                {/* Show main errors here instead of main screen */}
                {hasErrors && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Timetable Generation Issues</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">The generator encountered issues. The following problems were found:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {currentTimetables.errors!.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                      <p className="mt-3">
                        {isRegenerating ? 
                          "The system is automatically regenerating in the background to fix period count mismatches and eliminate free periods..." :
                          "The system will automatically regenerate to fix period count mismatches and eliminate free periods."
                        }
                      </p>
                      <Button variant="outline" size="sm" onClick={onRestart} className="mt-3 bg-card hover:bg-card/90">
                        Go Back & Adjust Configuration
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {periodValidation.length > 0 ? (
                  <div className="space-y-4">
                    {currentTimetables.classes.map((classItem) => {
                      const classValidation = periodValidation.filter(v => v.className === classItem.name);
                      const hasIssues = classValidation.some(v => !v.isValid);
                      
                      return (
                        <div key={classItem.name} className={`border rounded-lg p-4 ${hasIssues ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                          <h5 className="font-medium mb-3 flex items-center gap-2">
                            {hasIssues ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                            {classItem.name}
                          </h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            {classValidation.map((validation, idx) => (
                              <div key={idx} className={`p-2 rounded border ${validation.isValid ? 'border-green-300 bg-green-100' : 'border-red-300 bg-red-100'}`}>
                                <div className="font-medium">{validation.subjectName}</div>
                                <div className="text-xs">
                                  Expected: {validation.expectedPeriods} | Actual: {validation.actualPeriods}
                                  {!validation.isValid && <span className="text-red-600 font-medium"> ⚠️</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No validation data available. Generate timetables to see period count comparison.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      <div className="flex flex-row w-full gap-4">
        <nav className="min-w-[180px] border-r pt-4">
          {items.map((itm, idx) => (
            <div key={idx} className="mb-1">
              <button
                className={`w-full px-4 py-2 rounded text-left hover:bg-secondary ${activeIdx === idx ? "bg-accent font-semibold" : ""}`}
                onClick={() => setActiveIdx(idx)}
              >
                {itm.name}
              </button>
            </div>
          ))}
        </nav>
        
        <div className="flex-1 px-6 pt-2 overflow-x-auto">
          {items[activeIdx] && renderEnhancedTable(
            items[activeIdx].table, 
            items[activeIdx].name, 
            (items[activeIdx] as any).facultyDetails as FacultySubjectDetails[] | undefined
          )}
          
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={onRestart}>Start Over</Button>
          </div>
        </div>
        
        <aside className="min-w-[120px] px-2 py-4">
          <div className="font-semibold mb-2 text-muted-foreground">Legend</div>
          <div className="flex flex-col gap-2 text-xs">
            <span><span className="inline-block w-4 h-4 bg-purple-100 mr-2 border" /> Lab</span>
            <span><span className="inline-block w-4 h-4 bg-orange-200 mr-2 border" /> Break/Lunch</span>
            <span><span className="inline-block w-4 h-4 bg-green-100 mr-2 border" /> Special</span>
            <span><span className="inline-block w-4 h-4 bg-red-100 mr-2 border" /> Free</span>
          </div>
        </aside>
      </div>
      </div>
    </DndContext>
  );
};

export default TimetableTabs;
