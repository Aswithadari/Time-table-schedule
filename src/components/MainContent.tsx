
import { useState, useEffect } from "react";
import Auth from "./Auth";
import UploadAllocation from "./UploadAllocation";
import ConfigWizard from "./ConfigWizard";
import TimetableTabs from "./TimetableTabs";
import { generateTimetables } from "../utils/timetableGenerator";
import { clearSavedFacultyData } from "../utils/dataStorage";
import { clearSavedConfigData } from "../utils/configStorage";
import { resetScrollToTop } from "../utils/scrollReset";
import { LabResource, ClassCapacityInfo } from "../utils/labSchedulingUtils";

type MainContentProps = {
  onStepChange: (step: "auth" | "upload" | "config" | "view") => void;
  onRestartChange: (restart: () => void) => void;
};

const MainContent = ({ onStepChange, onRestartChange }: MainContentProps) => {
  const [step, setStep] = useState<"auth" | "upload" | "config" | "view">("auth");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [labResources, setLabResources] = useState<LabResource[]>([]);
  const [classCapacities, setClassCapacities] = useState<ClassCapacityInfo[]>([]);
  const [timetables, setTimetables] = useState<any>(null);

  // Reset scroll whenever step changes
  useEffect(() => {
    resetScrollToTop();
  }, [step]);

  const onAuthSuccess = () => {
    setIsAuthenticated(true);
    const newStep = "upload";
    setStep(newStep);
    onStepChange(newStep);
  };

  const handleUpload = (data: any[]) => {
    console.log("Faculty data uploaded:", data);
    setFacultyData(data);
    const newStep = "config";
    setStep(newStep);
    onStepChange(newStep);
  };

  const handleConfigDone = (configObj: any, labRes?: LabResource[], classCapac?: ClassCapacityInfo[]) => {
    console.log("Config completed:", configObj);
    console.log("Lab resources:", labRes);
    console.log("Class capacities:", classCapac);
    console.log("Faculty data for timetable generation:", facultyData);
    
    setConfig(configObj);
    setLabResources(labRes || []);
    setClassCapacities(classCapac || []);

    // Generate real timetables from the configuration and faculty data
    const generatedTimetables = generateTimetables(configObj, facultyData, labRes, classCapac);
    console.log("Generated timetables:", generatedTimetables);
    
    setTimetables(generatedTimetables);
    const newStep = "view";
    setStep(newStep);
    onStepChange(newStep);
  };

  const restart = () => {
    setStep("auth");
    setIsAuthenticated(false);
    setFacultyData([]);
    setConfig(null);
    setLabResources([]);
    setClassCapacities([]);
    setTimetables(null);
    
    // Clear saved faculty data and config data on restart
    clearSavedFacultyData();
    clearSavedConfigData();
    console.log("All saved data cleared on restart");
    
    onStepChange("auth");
  };

  // Pass restart function to parent
  onRestartChange(restart);

  return (
    <section className="w-full flex-1 py-6">
      {step === "auth" && (
        <Auth onAuthSuccess={onAuthSuccess} />
      )}
      {isAuthenticated && step === "upload" && (
        <UploadAllocation onUpload={handleUpload} />
      )}
      {isAuthenticated && step === "config" && (
        <ConfigWizard
          facultyData={facultyData}
          onConfigDone={handleConfigDone}
          onBack={() => {
            const newStep = "upload";
            setStep(newStep);
            onStepChange(newStep);
          }}
        />
      )}
      {isAuthenticated && step === "view" && timetables && (
        <TimetableTabs
          timetables={timetables}
          onRestart={restart}
          config={config}
          labResources={labResources}
          classCapacities={classCapacities}
        />
      )}
    </section>
  );
};

export default MainContent;
