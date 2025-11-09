
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = {
  name: string;
  code: string;
  periods: number;
  isLab: boolean;
  teacher: string;
  allowCombine?: boolean;
  combineWithClasses?: string[]; // New field to store selected classes to combine with
  periodType?: 'daily' | 'weekly' | 'custom'; // NEW: Period type selection
};

type ClassConfig = {
  name: string;
  subjects: Subject[];
  workingDays: number;
  periodsPerDay: number;
  lunchAfter: number;
  breakAfter: number;
};

type ClassSubjectsConfigProps = {
  classConfigs: ClassConfig[];
  onEdit: (clIdx: number, subjIdx: number, field: string, value: any) => void;
  validationErrors: Record<string, string>;
  onAutoAdjustAll: () => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerationDisabled: boolean;
  teacherWorkload: Record<string, number>;
};

const ClassSubjectsConfig = ({
  classConfigs,
  onEdit,
  validationErrors,
  onAutoAdjustAll,
  onBack,
  onGenerate,
  isGenerationDisabled,
  teacherWorkload,
}: ClassSubjectsConfigProps) => {
  // Helper function to find which classes can be combined for a given subject
  const getCombinableClasses = (currentClassIdx: number, currentSubject: Subject) => {
    if (!currentSubject.allowCombine || !currentSubject.teacher || currentSubject.teacher === "N/A") {
      return [];
    }

    const combinableClasses: string[] = [];
    classConfigs.forEach((classConfig, idx) => {
      if (idx === currentClassIdx) return; // Skip current class
      
      const matchingSubject = classConfig.subjects.find(s => 
        (s.code === currentSubject.code || s.name === currentSubject.name) &&
        s.teacher === currentSubject.teacher &&
        s.allowCombine
      );
      
      if (matchingSubject) {
        combinableClasses.push(classConfig.name);
      }
    });
    
    return combinableClasses;
  };

  // Helper function to handle combining class selection
  const handleCombineClassToggle = (clIdx: number, subjIdx: number, className: string) => {
    const currentSubject = classConfigs[clIdx].subjects[subjIdx];
    const currentCombineClasses = currentSubject.combineWithClasses || [];
    
    let newCombineClasses;
    if (currentCombineClasses.includes(className)) {
      // Remove the class from combination
      newCombineClasses = currentCombineClasses.filter(c => c !== className);
    } else {
      // Add the class to combination
      newCombineClasses = [...currentCombineClasses, className];
    }
    
    onEdit(clIdx, subjIdx, "combineWithClasses", newCombineClasses);
  };

  // Helper function to get period description
  const getPeriodDescription = (subject: Subject, classConfig: ClassConfig) => {
    const periodType = subject.periodType || 'daily';
    const totalPeriodsPerWeek = classConfig.workingDays * classConfig.periodsPerDay;
    
    if (periodType === 'daily') {
      return `${subject.periods} per day (${subject.periods * classConfig.workingDays}/week)`;
    } else if (periodType === 'weekly') {
      return `${subject.periods} per week`;
    } else {
      return `${subject.periods} per week (custom)`;
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-3 text-lg text-gray-900">Subjects per Class</h3>
      <p className="text-sm text-gray-700 font-semibold mb-4">
        Configure subjects and periods for each class. Each class has its own period configuration including break and lunch timings.
        Enable "Combine" to allow same subjects taught by the same teacher to be scheduled together across different classes, then select specific classes to combine with.
      </p>
      <div className="flex mb-8">
        <Button type="button" variant="outline" onClick={onAutoAdjustAll}>
          Auto Adjust All Periods
        </Button>
        <span className="text-xs text-gray-600 font-semibold ml-3 pt-2">(Will redistribute periods among regular subjects for each class)</span>
      </div>
      <div className="space-y-6">
        {classConfigs.map((cls, clIdx) => {
          const totalPeriodsPerWeek = cls.workingDays * cls.periodsPerDay;
          return (
            <div key={clIdx} className="bg-slate-800/50 rounded p-4 mb-2 border border-slate-700/50">
              <h4 className="font-medium mb-2 text-white">{cls.name}</h4>
              <div className="text-sm text-gray-700 font-semibold mb-3">
                {cls.workingDays} days × {cls.periodsPerDay} periods = {totalPeriodsPerWeek} total periods/week 
                <br />
                Break after period {cls.breakAfter}, Lunch after period {cls.lunchAfter}
              </div>
              {validationErrors[cls.name] && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationErrors[cls.name]}</AlertDescription>
                </Alert>
              )}
              <table className="min-w-full text-sm border shadow bg-slate-900/50">
                <thead>
                  <tr className="bg-slate-800/70">
                    <th className="px-2 py-2 text-white font-semibold text-left">Subject</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Teacher (Total)</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Code</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Period Type</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Periods</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Lab (Optional)</th>
                    <th className="px-2 py-2 text-white font-semibold text-left">Combine With Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {cls.subjects.map((subj, subjIdx) => {
                    const combinableClasses = getCombinableClasses(clIdx, subj);
                    const selectedCombineClasses = subj.combineWithClasses || [];
                    return (
                      <tr key={subjIdx} className="border-t border-slate-700/30 hover:bg-slate-800/30">
                        <td className="px-2 py-2">
                          <input
                            className="border border-slate-600 rounded px-2 py-1 min-w-[100px] bg-slate-700/50 text-white placeholder-slate-400"
                            value={subj.name}
                            onChange={e => onEdit(clIdx, subjIdx, "name", e.target.value)}
                            placeholder="Subject name"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="px-1 py-0.5 text-gray-800 font-bold truncate" title={`${subj.teacher} (Total: ${teacherWorkload[subj.teacher] || 0})`}>
                            {subj.teacher} ({teacherWorkload[subj.teacher] || 0})
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="border border-slate-600 rounded px-2 py-1 min-w-[70px] bg-slate-700/50 text-white placeholder-slate-400"
                            value={subj.code}
                            onChange={e => onEdit(clIdx, subjIdx, "code", e.target.value)}
                            placeholder="Code"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={subj.periodType || 'daily'}
                            onChange={e => onEdit(clIdx, subjIdx, "periodType", e.target.value)}
                            className="border border-slate-600 rounded px-2 py-1 bg-slate-700/50 text-white text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="custom">Custom</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              min={1}
                              className="border border-slate-600 rounded px-2 py-1 w-16 bg-slate-700/50 text-white placeholder-slate-400"
                              value={subj.periods}
                              onChange={e => onEdit(clIdx, subjIdx, "periods", +e.target.value)}
                            />
                            <span className="text-xs text-gray-700 font-semibold">{getPeriodDescription(subj, cls)}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!subj.isLab}
                              onChange={e => onEdit(clIdx, subjIdx, "isLab", e.target.checked)}
                              className="w-4 h-4 cursor-pointer"
                              title="Check if this is a lab subject (optional)"
                            />
                            <span className="text-xs text-gray-700 font-semibold">Lab</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-2 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!subj.allowCombine}
                                onChange={e => onEdit(clIdx, subjIdx, "allowCombine", e.target.checked)}
                                title="Allow this subject to be combined with same subject in other classes when taught by same teacher"
                                className="w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs text-gray-800 font-semibold">Enable Combine</span>
                            </div>
                            
                            {subj.allowCombine && combinableClasses.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-700 font-semibold">Select classes to combine with:</div>
                                <div className="flex flex-wrap gap-1">
                                  {combinableClasses.map(className => (
                                    <label key={className} className="flex items-center gap-1 text-xs bg-slate-700/50 px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={selectedCombineClasses.includes(className)}
                                        onChange={() => handleCombineClassToggle(clIdx, subjIdx, className)}
                                        className="w-3 h-3 cursor-pointer"
                                      />
                                      <span className="text-gray-800 font-semibold">{className}</span>
                                    </label>
                                  ))}
                                </div>
                                {selectedCombineClasses.length > 0 && (
                                  <div className="text-xs text-green-400 font-medium">
                                    ✓ Will combine with: {selectedCombineClasses.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {subj.allowCombine && combinableClasses.length === 0 && (
                              <span className="text-xs text-yellow-500">
                                ⚠ No matching classes found
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="secondary" type="button" onClick={onBack} className="text-white">Back</Button>
        <Button type="button" onClick={onGenerate} disabled={isGenerationDisabled} className="bg-blue-600 hover:bg-blue-700 text-white">Generate Timetable</Button>
      </div>
    </div>
  );
};

export default ClassSubjectsConfig;

