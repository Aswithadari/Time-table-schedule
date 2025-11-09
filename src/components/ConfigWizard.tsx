import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PeriodSetupForm from "./PeriodSetupForm";
import ClassSubjectsConfig from "./ClassSubjectsConfig";
import LabCapacityConfig from "./LabCapacityConfig";
import { LabResource, ClassCapacityInfo, validateClassCapacities } from "../utils/labSchedulingUtils";
import { saveConfigData, getSavedConfigData } from "../utils/configStorage";
import { resetScrollToTop } from "../utils/scrollReset";
import { 
  classNameSorter, 
  validateClassPeriodAllocation, 
  calculateOptimalPeriodDistribution,
  clampPeriodCount,
  generateShortName
} from "../utils/timetableHelpers";

// Helper function: extract all classes and mapped subjects from facultyData
function getClassesAndSubjects(facultyData: any[]) {
  console.log("Processing faculty data:", facultyData);
  
  const classSet = new Set<string>();
  const subjectsMap: Record<string, Set<string>> = {};
  
  facultyData.forEach(row => {
    console.log("Processing row:", row);
    
    // Handle both comma-separated classes and single class entries
    let classNames: string[] = [];
    if (row.Classes) {
      if (typeof row.Classes === 'string') {
        if (row.Classes.includes(',')) {
          classNames = row.Classes.split(',').map((cls: string) => cls.trim()).filter(Boolean);
        } else {
          classNames = [row.Classes.trim()];
        }
      }
    }
    
    console.log("Extracted class names:", classNames);
    
    classNames.forEach((className: string) => {
      if (!className) return;
      
      classSet.add(className);
      if (!subjectsMap[className]) {
        subjectsMap[className] = new Set();
      }
      if (row.Subject && row.Subject.trim()) {
        subjectsMap[className].add(row.Subject.trim());
      }
    });
  });
  
  // Sort classes digit-first, then alphabetical
  const classListSorted = Array.from(classSet).sort(classNameSorter);
  const finalSubjectsMap = Object.fromEntries(
    Object.entries(subjectsMap).map(([cls, subjSet]) => [cls, Array.from(subjSet)])
  );
  
  console.log("Final class list:", classListSorted);
  console.log("Final subjects map:", finalSubjectsMap);
  
  return {
    classList: classListSorted,
    subjectsMap: finalSubjectsMap,
  };
}

type ConfigWizardProps = {
  facultyData: any[];
  onConfigDone: (obj: any, labResources?: LabResource[], classCapacities?: ClassCapacityInfo[]) => void;
  onBack: () => void;
};

// MAIN COMPONENT
const ConfigWizard = ({ facultyData, onConfigDone, onBack }: ConfigWizardProps) => {
  const { classList, subjectsMap } = useMemo(() => {
    console.log("Recalculating classes and subjects from faculty data");
    return getClassesAndSubjects(facultyData);
  }, [facultyData]);

  const teacherMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    if (!facultyData) return map;
    
    facultyData.forEach((row: any) => {
      if (!row.Classes || !row.Subject || !row.Name) return;
      
      // Handle both comma-separated and single class entries
      let classNames: string[] = [];
      if (typeof row.Classes === 'string') {
        if (row.Classes.includes(',')) {
          classNames = row.Classes.split(',').map((c: string) => c.trim()).filter(Boolean);
        } else {
          classNames = [row.Classes.trim()];
        }
      }
      
      const subject = row.Subject.trim();
      const teacher = row.Name.trim();
      
      classNames.forEach((className: string) => {
        if (!map[className]) map[className] = {};
        map[className][subject] = teacher;
      });
    });
    
    console.log("Teacher map:", map);
    return map;
  }, [facultyData]);

  const [step, setStep] = useState(1);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [lastGenerationErrors, setLastGenerationErrors] = useState<string[]>([]);
  
  // Initialize with saved data or defaults - ensure we use the latest classList
  const [classPeriodConfigs, setClassPeriodConfigs] = useState<{
    name: string;
    workingDays: number;
    periodsPerDay: number;
    lunchAfter: number;
    breakAfter: number;
    selectedDays: string[];
    lectureHall: string;
    classCapacity: number;
  }[]>(() => {
    const savedData = getSavedConfigData();
    
    // Always use the current classList from facultyData, not saved data
    console.log("Initializing period configs for classes:", classList);
    
    return classList.map(cls => ({
      name: cls,
      workingDays: 6,
      periodsPerDay: 6,
      lunchAfter: 3,
      breakAfter: 0,
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      lectureHall: `LH-${cls}`,
      classCapacity: 96,
    }));
  });

  // Update classPeriodConfigs whenever classList changes
  useEffect(() => {
    console.log("Class list changed, updating period configs:", classList);
    setClassPeriodConfigs(classList.map(cls => ({
      name: cls,
      workingDays: 6,
      periodsPerDay: 6,
      lunchAfter: 3,
      breakAfter: 0,
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      lectureHall: `LH-${cls}`,
      classCapacity: 96,
    })));
  }, [classList]);

  const [classConfigs, setClassConfigs] = useState<any[]>([]);
  const [labResources, setLabResources] = useState<LabResource[]>([]);
  const [classCapacities, setClassCapacities] = useState<ClassCapacityInfo[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset scroll when component mounts or step changes
  useEffect(() => {
    resetScrollToTop();
  }, [step]);

  // Save data whenever configurations change
  useEffect(() => {
    if (classPeriodConfigs.length > 0 || classConfigs.length > 0) {
      saveConfigData(classPeriodConfigs, classConfigs);
    }
  }, [classPeriodConfigs, classConfigs]);

  const teacherWorkload = useMemo(() => {
    const workload: Record<string, number> = {};
    classConfigs.forEach(config => {
      if (config.subjects) {
        config.subjects.forEach((subject: any) => {
          if (subject.teacher && subject.teacher !== "N/A") {
            if (!workload[subject.teacher]) {
              workload[subject.teacher] = 0;
            }
            workload[subject.teacher] += Number(subject.periods) || 0;
          }
        });
      }
    });
    return workload;
  }, [classConfigs]);

  // Validate teacher workload (max 42 periods per teacher)
  const validateTeacherWorkload = () => {
    const overloadedTeachers = Object.entries(teacherWorkload).filter(([teacher, periods]) => periods > 42);
    if (overloadedTeachers.length > 0) {
      const errorMessage = `Teacher workload exceeded: ${overloadedTeachers.map(([teacher, periods]) => `${teacher} (${periods} periods)`).join(', ')}. Maximum allowed: 42 periods per teacher.`;
      toast.error(errorMessage);
      return false;
    }
    return true;
  };

  // Initialize subjects per class (after step 1) and sync period config changes
  useEffect(() => {
    if (step === 2 || step === 3) {
      console.log(`Step ${step}: ${step === 2 ? 'Initializing' : 'Syncing'} class configs`);
      console.log("Period configs:", classPeriodConfigs);
      console.log("Subjects map:", subjectsMap);
      console.log("Teacher map:", teacherMap);
      
      if (step === 2) {
        // Create new configurations based on current data
        const newClassConfigs = classPeriodConfigs.map(classConfig => ({
          name: classConfig.name,
          workingDays: classConfig.workingDays,
          periodsPerDay: classConfig.periodsPerDay,
          lunchAfter: classConfig.lunchAfter,
          breakAfter: classConfig.breakAfter,
          selectedDays: classConfig.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          lectureHall: classConfig.lectureHall,
          classCapacity: classConfig.classCapacity,
          subjects: (subjectsMap[classConfig.name] || []).map(subjectName => {
            // Set default periods based on subject type
            let defaultPeriods = 3; // Default for regular subjects
            
            if (subjectName.toLowerCase().includes("mentor") || 
                subjectName.toLowerCase().includes("library") || 
                subjectName.toLowerCase().includes("sports")) {
              defaultPeriods = 1; // Set default to 1 for mentor, library, sports
            } else if (subjectName.toLowerCase().includes("lab")) {
              defaultPeriods = 2; // Lab default is now 2 periods
            }
            
            return {
              name: subjectName,
              code: generateShortName(subjectName), // Auto-generate short name
              periods: clampPeriodCount(defaultPeriods),
              isLab: !!subjectName.toLowerCase().includes("lab"),
              teacher: teacherMap[classConfig.name]?.[subjectName] || "N/A",
              allowCombine: false,
              combineWithClasses: [],
            };
          }),
        }));
        
        console.log("New class configs:", newClassConfigs);
        setClassConfigs(newClassConfigs);
      } else if (step === 3) {
        // Sync period configuration changes and lecture hall to existing classConfigs
        setClassConfigs(prevConfigs => 
          prevConfigs.map(config => {
            const periodConfig = classPeriodConfigs.find(pc => pc.name === config.name);
            if (periodConfig && (
              config.workingDays !== periodConfig.workingDays ||
              config.periodsPerDay !== periodConfig.periodsPerDay ||
              config.lunchAfter !== periodConfig.lunchAfter ||
              config.breakAfter !== periodConfig.breakAfter ||
              config.lectureHall !== periodConfig.lectureHall ||
              config.classCapacity !== periodConfig.classCapacity
            )) {
              console.log(`Syncing period config for ${config.name}`);
              return {
                ...config,
                workingDays: periodConfig.workingDays,
                periodsPerDay: periodConfig.periodsPerDay,
                lunchAfter: periodConfig.lunchAfter,
                breakAfter: periodConfig.breakAfter,
                selectedDays: periodConfig.selectedDays || config.selectedDays,
                lectureHall: periodConfig.lectureHall,
                classCapacity: periodConfig.classCapacity,
              };
            }
            return config;
          })
        );
      }
    }
  }, [step, classPeriodConfigs, subjectsMap, teacherMap]);

  // Enhanced validation with improved error messaging - runs for both step 2 and 3
  useEffect(() => {
    if (step === 2 || step === 3) {
      const errors: Record<string, string> = {};
      classConfigs.forEach(config => {
        const totalPeriodsPerWeek = config.workingDays * config.periodsPerDay;
        const validation = validateClassPeriodAllocation(config.subjects, totalPeriodsPerWeek);
        
        if (!validation.isValid) {
          errors[config.name] = validation.errors.join(' ');
        }
      });
      setValidationErrors(errors);
    } else {
      setValidationErrors({});
    }
  }, [classConfigs, step]);

  // Period setup form submit
  const handlePeriodsSetup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Moving to step 2 with configs:", classPeriodConfigs);
    
    // Initialize class capacities with default values
    const defaultCapacities: ClassCapacityInfo[] = classList.map(className => ({
      className,
      studentsCount: 96, // Default student count
    }));
    setClassCapacities(defaultCapacities);
    
    setStep(2);
    toast.success("Period configuration saved!");
  };

  // Lab configuration handlers
  const handleLabNext = () => {
    // Validate lab configuration
    const availableSubjects = Array.from(new Set(
      Object.values(subjectsMap).flat()
    ));
    
    const capacityValidation = validateClassCapacities(
      classCapacities,
      labResources,
      subjectsMap
    );
    
    if (!capacityValidation.isValid) {
      toast.error(capacityValidation.errors.join(', '));
      return;
    }
    
    if (capacityValidation.warnings.length > 0) {
      capacityValidation.warnings.forEach(warning => toast.warning(warning));
    }
    
    setStep(3);
    toast.success("Lab configuration completed!");
  };

  const handleClassCapacityChange = (className: string, studentsCount: number) => {
    setClassCapacities(capacities =>
      capacities.map(cap =>
        cap.className === className ? { ...cap, studentsCount } : cap
      )
    );
  };

  // Enhanced subject edit handler with immediate validation
  const handleSubjectsEdit = (clIdx: number, subjIdx: number, field: string, value: any) => {
    const updatedConfigs = classConfigs.map((conf, i) =>
      i !== clIdx
        ? conf
        : {
            ...conf,
            subjects: conf.subjects.map((subj, j) =>
              j !== subjIdx ? subj : { 
                ...subj, 
                [field]: field === 'periods' ? clampPeriodCount(Number(value) || 0) : value
              }
            )
          }
    );
    
    setClassConfigs(updatedConfigs);
    
    // Immediately validate after edit
    if (field === 'periods') {
      const errors: Record<string, string> = {};
      updatedConfigs.forEach(config => {
        const totalPeriodsPerWeek = config.workingDays * config.periodsPerDay;
        const validation = validateClassPeriodAllocation(config.subjects, totalPeriodsPerWeek);
        
        if (!validation.isValid) {
          errors[config.name] = validation.errors.join(' ');
        }
      });
      setValidationErrors(errors);
    }
  };

  // Enhanced auto-adjust with optimal distribution
  const handleAutoAdjustAll = () => {
    console.log("Auto-adjusting periods for all classes...");
    setClassConfigs(configs =>
      configs.map(conf => {
        const totalPeriodsPerWeek = conf.workingDays * conf.periodsPerDay;
        console.log(`Auto-adjusting class ${conf.name} with ${totalPeriodsPerWeek} total periods`);
        const adjustedSubjects = calculateOptimalPeriodDistribution(conf.subjects, totalPeriodsPerWeek);
        console.log(`Adjusted subjects for ${conf.name}:`, adjustedSubjects);
        return {
          ...conf,
          subjects: adjustedSubjects,
        };
      })
    );
    setTimeout(() => {
      toast.success("All classes' periods auto-adjusted with optimal distribution!");
    }, 100);
  };

  // Enhanced Generate Timetable with up to 50 regenerations for period count errors
  const handleComplete = () => {
    console.log("Generate Timetable button clicked");
    console.log("Current validation errors:", validationErrors);
    console.log("Current class configs:", classConfigs);
    console.log("Teacher workload:", teacherWorkload);
    console.log("Regeneration count:", regenerationCount);
    
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix the period allocation errors before generating.");
      return;
    }

    // Validate teacher workload before generation
    if (!validateTeacherWorkload()) {
      return;
    }

    // Final validation before generation
    const finalValidationErrors: string[] = [];
    classConfigs.forEach(config => {
      const validation = validateClassPeriodAllocation(
        config.subjects, 
        config.workingDays * config.periodsPerDay
      );
      if (!validation.isValid) {
        finalValidationErrors.push(`${config.name}: ${validation.errors.join(', ')}`);
      }
    });

    if (finalValidationErrors.length > 0) {
      toast.error("Configuration validation failed: " + finalValidationErrors.join('; '));
      return;
    }

    console.log('Starting timetable generation with validated configuration');
    console.log('Passing configuration to onConfigDone:', {
      classes: classConfigs,
      regenerationCount,
      maxRegenerations: 50
    });
    
    onConfigDone({
      classes: classConfigs,
      regenerationCount,
      maxRegenerations: 50,
      onRegenerationError: (errors: string[]) => {
        setLastGenerationErrors(errors);
        setRegenerationCount(prev => prev + 1);
        
        // Check if errors are related to expected vs actual periods
        const hasPeriodCountErrors = errors.some(error => 
          error.includes('Expected') && error.includes('periods') && error.includes('got')
        );
        
        if (hasPeriodCountErrors && regenerationCount < 50) {
          console.log(`Regeneration attempt ${regenerationCount + 1}/50 due to period count errors`);
          toast.info(`Regenerating timetable... Attempt ${regenerationCount + 1}/50`);
          
          // Trigger regeneration after a short delay
          setTimeout(() => {
            handleComplete();
          }, 100);
          return;
        }
        
        if (regenerationCount >= 50) {
          toast.error("Failed to generate timetable after 50 attempts. Please adjust the configuration.");
          setRegenerationCount(0);
        }
      }
    }, labResources, classCapacities);
  };

  const isGenerationDisabled = Object.keys(validationErrors).length > 0;

  // Show debug info
  console.log("Current state:", {
    step,
    classList,
    classPeriodConfigs,
    classConfigs,
    facultyData
  });

  // --- UI ---
  return (
    <div className="max-w-4xl mx-auto mt-10 bg-card rounded-xl p-8 shadow border">
      {regenerationCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            Regeneration attempt: {regenerationCount}/50
            {lastGenerationErrors.length > 0 && (
              <span className="block mt-1 text-xs">
                Last errors: {lastGenerationErrors.slice(0, 2).join(', ')}
              </span>
            )}
          </p>
        </div>
      )}
      
      {step === 1 && (
        <PeriodSetupForm
          classList={classList}
          classConfigs={classPeriodConfigs}
          onConfigChange={setClassPeriodConfigs}
          onSubmit={handlePeriodsSetup}
          onBack={onBack}
        />
      )}
      {step === 2 && (
        <div className="space-y-6">
          <LabCapacityConfig
            labResources={labResources}
            onLabResourcesChange={setLabResources}
            availableSubjects={Array.from(new Set(Object.values(subjectsMap).flat()))}
            onNext={handleLabNext}
            onBack={() => setStep(1)}
          />
          
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Class Capacities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classCapacities.map((capacity) => (
                <div key={capacity.className} className="flex items-center gap-3">
                  <label className="font-medium min-w-0 flex-1">{capacity.className}:</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={capacity.studentsCount}
                    onChange={(e) => handleClassCapacityChange(capacity.className, parseInt(e.target.value) || 96)}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <span className="text-sm text-muted-foreground">students</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {step === 3 && (
        <ClassSubjectsConfig
          classConfigs={classConfigs}
          onEdit={handleSubjectsEdit}
          validationErrors={validationErrors}
          onAutoAdjustAll={handleAutoAdjustAll}
          onBack={() => setStep(2)}
          onGenerate={handleComplete}
          isGenerationDisabled={isGenerationDisabled}
          teacherWorkload={teacherWorkload}
        />
      )}
    </div>
  );
};

export default ConfigWizard;
