
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DaySelectorProps = {
  selectedDays: string[];
  onDaysChange: (days: string[]) => void;
  className?: string;
};

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const DaySelector = ({ selectedDays, onDaysChange, className }: DaySelectorProps) => {
  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day));
    } else {
      onDaysChange([...selectedDays, day]);
    }
  };

  const select5DayWeek = () => {
    // Monday to Friday
    const fiveDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    onDaysChange(fiveDays);
  };

  const select6DayWeek = () => {
    // Monday to Saturday
    const sixDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    onDaysChange(sixDays);
  };

  const clearAllDays = () => {
    onDaysChange([]);
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <Label className="font-bold text-gray-900">Select College Working Days</Label>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          type="button"
          onClick={select5DayWeek}
          className="bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white font-semibold"
          title="Select 5-day week (Mon-Fri)"
        >
          5 Days (Mon-Fri)
        </Button>
        <Button
          type="button"
          onClick={select6DayWeek}
          className="bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white font-semibold"
          title="Select 6-day week (Mon-Sat)"
        >
          6 Days (Mon-Sat)
        </Button>
        <Button
          type="button"
          onClick={clearAllDays}
          variant="outline"
          className="text-gray-700 font-semibold border-gray-400"
          title="Clear all selected days"
        >
          Clear All
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DAYS_OF_WEEK.map(day => (
          <div key={day.value} className="flex items-center space-x-2">
            <Checkbox
              id={day.value}
              checked={selectedDays.includes(day.value)}
              onCheckedChange={() => handleDayToggle(day.value)}
            />
            <Label htmlFor={day.value} className="text-sm cursor-pointer font-semibold text-gray-800">
              {day.label}
            </Label>
          </div>
        ))}
      </div>
      
      <div className="text-sm text-gray-700 font-semibold mt-3">
        Selected: <span className="text-teal-600 font-bold">{selectedDays.length}</span> days
        {selectedDays.length > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DaySelector;
