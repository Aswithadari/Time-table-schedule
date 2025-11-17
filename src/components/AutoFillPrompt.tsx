
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Clock, X } from "lucide-react";
import { getSavedFacultyData, clearSavedFacultyData, type SavedFacultyData } from "../utils/dataStorage";

type AutoFillPromptProps = {
  onUseData: (data: any[]) => void;
  onSkip: () => void;
};

const AutoFillPrompt = ({ onUseData, onSkip }: AutoFillPromptProps) => {
  const [savedData] = useState<SavedFacultyData | null>(getSavedFacultyData());
  const [isClearing, setIsClearing] = useState(false);

  if (!savedData) {
    return null;
  }

  const handleUseData = () => {
    onUseData(savedData.data);
  };

  const handleClearData = () => {
    setIsClearing(true);
    clearSavedFacultyData();
    setTimeout(() => {
      onSkip();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-2xl mx-auto mt-16">
      <Card className="border-teal-200 bg-teal-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-900">
            <Upload className="h-5 w-5" />
            Saved Data Found
          </CardTitle>
          <CardDescription>
            We found previously uploaded faculty data. Would you like to use it again?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div><strong>Data saved:</strong> {formatDate(savedData.savedAt)}</div>
                {savedData.fileName && <div><strong>File:</strong> {savedData.fileName}</div>}
                <div><strong>Records:</strong> {savedData.data.length} faculty entries</div>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={handleClearData}
              disabled={isClearing}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear & Upload New
            </Button>
            <Button onClick={onSkip} variant="secondary">
              Skip & Upload New
            </Button>
            <Button onClick={handleUseData} className="flex items-center gap-1">
              <Upload className="h-4 w-4" />
              Use Saved Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoFillPrompt;
