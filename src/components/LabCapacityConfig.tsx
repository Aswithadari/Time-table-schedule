import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { LabResource } from "@/utils/labSchedulingUtils";

interface LabCapacityConfigProps {
  labResources: LabResource[];
  onLabResourcesChange: (resources: LabResource[]) => void;
  availableSubjects: string[];
  onNext: () => void;
  onBack: () => void;
}

const LabCapacityConfig = ({
  labResources,
  onLabResourcesChange,
  availableSubjects,
  onNext,
  onBack,
}: LabCapacityConfigProps) => {
  const [newLabName, setNewLabName] = useState("");
  const [newLabCapacity, setNewLabCapacity] = useState(70);
  const [newLabType, setNewLabType] = useState<"lab" | "classroom">("lab");

  const addLabResource = () => {
    if (!newLabName.trim()) {
      toast.error("Please enter a lab/classroom name");
      return;
    }

    if (labResources.some(lab => lab.name.toLowerCase() === newLabName.toLowerCase())) {
      toast.error("A lab/classroom with this name already exists");
      return;
    }

    const newLab: LabResource = {
      id: Date.now().toString(),
      name: newLabName.trim(),
      capacity: newLabCapacity,
      type: newLabType,
      subjects: [],
    };

    onLabResourcesChange([...labResources, newLab]);
    setNewLabName("");
    setNewLabCapacity(70);
    toast.success(`${newLabType === "lab" ? "Lab" : "Classroom"} added successfully`);
  };

  const removeLabResource = (id: string) => {
    onLabResourcesChange(labResources.filter(lab => lab.id !== id));
    toast.success("Lab/Classroom removed");
  };

  const updateLabResource = (id: string, field: keyof LabResource, value: any) => {
    onLabResourcesChange(
      labResources.map(lab =>
        lab.id === id ? { ...lab, [field]: value } : lab
      )
    );
  };

  const toggleSubjectForLab = (labId: string, subject: string) => {
    const lab = labResources.find(l => l.id === labId);
    if (!lab) return;

    const newSubjects = lab.subjects.includes(subject)
      ? lab.subjects.filter(s => s !== subject)
      : [...lab.subjects, subject];

    updateLabResource(labId, "subjects", newSubjects);
  };

  const validateConfiguration = () => {
    if (labResources.length === 0) {
      toast.error("Please add at least one lab or classroom");
      return false;
    }

    const labSubjects = availableSubjects.filter(subject => 
      subject.toLowerCase().includes("lab")
    );

    if (labSubjects.length > 0) {
      const hasLabsForLabSubjects = labSubjects.every(subject =>
        labResources.some(lab => lab.subjects.includes(subject))
      );

      if (!hasLabsForLabSubjects) {
        toast.error("Please assign labs to all lab subjects");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateConfiguration()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lab & Classroom Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="labName">Name</Label>
              <Input
                id="labName"
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                placeholder="e.g., Computer Lab 1"
              />
            </div>
            <div>
              <Label htmlFor="labCapacity">Capacity</Label>
              <Input
                id="labCapacity"
                type="number"
                min="1"
                max="200"
                value={newLabCapacity}
                onChange={(e) => setNewLabCapacity(parseInt(e.target.value) || 70)}
              />
            </div>
            <div>
              <Label htmlFor="labType">Type</Label>
              <select
                id="labType"
                value={newLabType}
                onChange={(e) => setNewLabType(e.target.value as "lab" | "classroom")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="lab">Lab</option>
                <option value="classroom">Classroom</option>
              </select>
            </div>
            <Button onClick={addLabResource} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {labResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Labs & Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labResources.map((lab) => (
                <div key={lab.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <Input
                          value={lab.name}
                          onChange={(e) => updateLabResource(lab.id, "name", e.target.value)}
                          className="font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Capacity:</Label>
                        <Input
                          type="number"
                          min="1"
                          max="200"
                          value={lab.capacity}
                          onChange={(e) => updateLabResource(lab.id, "capacity", parseInt(e.target.value) || 70)}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Type:</Label>
                        <select
                          value={lab.type}
                          onChange={(e) => updateLabResource(lab.id, "type", e.target.value as "lab" | "classroom")}
                          className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        >
                          <option value="lab">Lab</option>
                          <option value="classroom">Classroom</option>
                        </select>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeLabResource(lab.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {availableSubjects.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Available for Subjects:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableSubjects.map((subject) => (
                          <label
                            key={subject}
                            className="flex items-center gap-2 text-sm bg-muted px-3 py-1 rounded cursor-pointer hover:bg-muted/80"
                          >
                            <input
                              type="checkbox"
                              checked={lab.subjects.includes(subject)}
                              onChange={() => toggleSubjectForLab(lab.id, subject)}
                              className="w-4 h-4"
                            />
                            {subject}
                          </label>
                        ))}
                      </div>
                      {lab.subjects.length > 0 && (
                        <div className="text-xs text-green-600 mt-2">
                          Assigned to: {lab.subjects.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next: Configure Subjects
        </Button>
      </div>
    </div>
  );
};

export default LabCapacityConfig;