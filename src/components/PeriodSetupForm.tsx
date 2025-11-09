import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DaySelector from "./DaySelector";
import { clampPeriodCount } from "../utils/timetableHelpers";

type ClassPeriodConfig = {
  name: string;
  workingDays: number;
  periodsPerDay: number;
  lunchAfter: number;
  breakAfter: number;
  selectedDays: string[];
  lectureHall: string;
  classCapacity: number;
};

type PeriodSetupFormProps = {
  classList: string[];
  classConfigs: ClassPeriodConfig[];
  onConfigChange: (configs: ClassPeriodConfig[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

const PeriodSetupForm = ({
  classList,
  classConfigs,
  onConfigChange,
  onSubmit,
  onBack
}: PeriodSetupFormProps) => {
  const handleClassConfigChange = (index: number, field: keyof ClassPeriodConfig, value: number | string[] | string) => {
    const newConfigs = [...classConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    
    // If selectedDays changes, update workingDays accordingly
    if (field === 'selectedDays' && Array.isArray(value)) {
      newConfigs[index].workingDays = value.length;
    }
    
    // Enhanced validation with proper clamping (0+ range, no upper limit)
    if (field === 'periodsPerDay') {
      newConfigs[index].periodsPerDay = clampPeriodCount(Number(value));
      // Adjust lunch and break periods if they exceed new periodsPerDay
      newConfigs[index].lunchAfter = Math.min(newConfigs[index].lunchAfter, newConfigs[index].periodsPerDay - 1);
      newConfigs[index].breakAfter = Math.min(newConfigs[index].breakAfter, newConfigs[index].periodsPerDay - 1);
    }
    if (field === 'lunchAfter') {
      newConfigs[index].lunchAfter = Math.max(2, Math.min(newConfigs[index].periodsPerDay - 1, Number(value)));
    }
    if (field === 'breakAfter') {
      newConfigs[index].breakAfter = Math.max(0, Math.min(newConfigs[index].periodsPerDay - 1, Number(value)));
    }
    
    onConfigChange(newConfigs);
  };

  const applyToAll = (field: keyof ClassPeriodConfig, value: number | string[]) => {
    const newConfigs = classConfigs.map(config => {
      const updatedConfig = { ...config, [field]: value };
      
      // If selectedDays changes, update workingDays accordingly
      if (field === 'selectedDays' && Array.isArray(value)) {
        updatedConfig.workingDays = value.length;
      }
      
      // Enhanced validation for all classes (0+ range, no upper limit)
      if (field === 'periodsPerDay') {
        updatedConfig.periodsPerDay = clampPeriodCount(Number(value));
        // Adjust dependent fields
        updatedConfig.lunchAfter = Math.min(updatedConfig.lunchAfter, updatedConfig.periodsPerDay - 1);
        updatedConfig.breakAfter = Math.min(updatedConfig.breakAfter, updatedConfig.periodsPerDay - 1);
      }
      if (field === 'lunchAfter') {
        updatedConfig.lunchAfter = Math.max(2, Math.min(updatedConfig.periodsPerDay - 1, Number(value)));
      }
      if (field === 'breakAfter') {
        updatedConfig.breakAfter = Math.max(1, Math.min(updatedConfig.periodsPerDay - 1, Number(value)));
      }
      
      return updatedConfig;
    });
    onConfigChange(newConfigs);
  };

  const defaultDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold mb-2">Timetable Configuration</h2>
      <div className="mb-4 text-sm text-muted-foreground">
        Configure periods (0+ per day), college days, lunch break, and tea break for each class individually. 
        Subject periods will be automatically validated to ensure they are within the 0+ range per week.
      </div>

      {/* Quick Apply Section */}
      <div className="bg-secondary rounded p-4 mb-6">
        <h3 className="font-medium mb-3">Quick Apply to All Classes</h3>
        <div className="space-y-4">
          <DaySelector
            selectedDays={defaultDays}
            onDaysChange={(days) => applyToAll('selectedDays', days)}
            className="mb-4"
          />
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <Label>Periods per day (0+)</Label>
              <Input 
                type="number" 
                min={0} 
                placeholder="6"
                defaultValue={6}
                className="w-20"
                onChange={e => e.target.value && applyToAll('periodsPerDay', +e.target.value)}
              />
            </div>
            <div>
              <Label>Lunch after period</Label>
              <Input 
                type="number" 
                min={2} 
                placeholder="3"
                defaultValue={3}
                className="w-20"
                onChange={e => e.target.value && applyToAll('lunchAfter', +e.target.value)}
              />
            </div>
            <div>
              <Label>Break after period (0 = no break)</Label>
              <Input 
                type="number" 
                min={0} 
                placeholder="0"
                defaultValue={0}
                className="w-20"
                onChange={e => e.target.value && applyToAll('breakAfter', +e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Individual Class Configurations */}
      <div className="space-y-4">
        <h3 className="font-medium">Individual Class Settings</h3>
        <div className="grid gap-4">
          {classConfigs.map((config, index) => (
            <div key={config.name} className="bg-background border rounded p-4">
              <h4 className="font-medium mb-3">{config.name}</h4>
              
              <DaySelector
                selectedDays={config.selectedDays || defaultDays}
                onDaysChange={(days) => handleClassConfigChange(index, 'selectedDays', days)}
                className="mb-4"
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm">Periods per day (0+)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.periodsPerDay}
                    onChange={e => handleClassConfigChange(index, 'periodsPerDay', +e.target.value)}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Total periods/week: {config.workingDays * config.periodsPerDay}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Lunch after period</Label>
                  <Input
                    type="number"
                    min={2}
                    max={Math.max(2, config.periodsPerDay - 1)}
                    value={config.lunchAfter}
                    onChange={e => handleClassConfigChange(index, 'lunchAfter', +e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm">Break after period (0 = no break)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, config.periodsPerDay - 1)}
                    value={config.breakAfter}
                    onChange={e => handleClassConfigChange(index, 'breakAfter', +e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm">Lecture Hall</Label>
                  <Input
                    type="text"
                    value={config.lectureHall}
                    placeholder={`LH-${config.name}`}
                    onChange={e => handleClassConfigChange(index, 'lectureHall', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm">Class Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.classCapacity}
                    onChange={e => handleClassConfigChange(index, 'classCapacity', +e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-8">
        <Button variant="secondary" type="button" onClick={onBack}>Back</Button>
        <Button type="submit">Next: Subjects</Button>
      </div>
    </form>
  );
};

export default PeriodSetupForm;
