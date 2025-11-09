import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { saveFacultyData, hasSavedFacultyData } from "../utils/dataStorage";
import AutoFillPrompt from "./AutoFillPrompt";

// Helper: Parse a CSV line into fields, handling quoted commas
function parseCSVLine(line: string) {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  fields.push(current.trim());
  
  return fields;
}

// Utility to parse class field robustly (trims, splits by comma, removes quotes)
function parseClassesField(val: string) {
  if (!val) return [];
  // Remove wrapping quotes, then split by comma, trim, and remove inner quotes
  return val
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map(cls => cls.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

type UploadProps = {
  onUpload: (data: any[]) => void;
};

const UploadAllocation = ({ onUpload }: UploadProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // Check for saved data on component mount
  useEffect(() => {
    if (hasSavedFacultyData()) {
      setShowAutoFill(true);
    }
  }, []);

  const handleAutoFillUse = (data: any[]) => {
    console.log("Using saved faculty data:", data);
    setRows(data);
    setShowAutoFill(false);
  };

  const handleAutoFillSkip = () => {
    setShowAutoFill(false);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed");
    setError("");
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setFileName(file.name);
    console.log("Selected file:", file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      console.log("File loaded, starting to parse");
      const text = reader.result as string;
      console.log("Raw CSV text:", text.substring(0, 200) + "...");

      // Split rows by line, remove extra empty
      const lines = text
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);

      console.log("Number of lines:", lines.length);

      if (lines.length < 2) {
        setError("CSV is empty or has no data.");
        return;
      }

      // parse each row correctly
      const headers = parseCSVLine(lines[0]);
      console.log("Headers:", headers);
      
      // More flexible header detection
      const nameIdx = headers.findIndex(h => /name|faculty/i.test(h));
      const subjectIdx = headers.findIndex(h => /subject/i.test(h));
      const classIdx = headers.findIndex(h => /class/i.test(h));
      
      if (nameIdx === -1 || subjectIdx === -1 || classIdx === -1) {
        // If headers don't match, assume standard order: Name, Subject, Classes
        console.log("Headers don't match expected format, using default order");
        if (headers.length < 3) {
          setError("CSV must have at least 3 columns: Faculty Name, Subject, Classes");
          return;
        }
      }

      const finalNameIdx = nameIdx !== -1 ? nameIdx : 0;
      const finalSubjectIdx = subjectIdx !== -1 ? subjectIdx : 1;
      const finalClassIdx = classIdx !== -1 ? classIdx : 2;

      const data: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        console.log(`Row ${i}:`, fields);
        
        if (fields.length < 3) {
          console.log(`Skipping row ${i} - not enough fields`);
          continue;
        }
        
        const name = fields[finalNameIdx]?.trim();
        const subject = fields[finalSubjectIdx]?.trim();
        const rawClasses = fields[finalClassIdx] || "";
        
        if (!name || !subject || !rawClasses) {
          console.log(`Skipping row ${i} - missing required data`);
          continue;
        }
        
        const classList = parseClassesField(rawClasses);
        console.log(`Classes for ${name}:`, classList);
        
        // Expand each class into its own row
        for (const cls of classList) {
          data.push({
            Name: name,
            Subject: subject,
            Classes: cls,
          });
        }
      }
      
      console.log("Final parsed data:", data);
      setRows(data);
    };
    
    reader.onerror = () => {
      console.error("Error reading file");
      setError("Error reading file");
    };
    
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      setError("Please upload a .csv file (Excel will be supported soon)");
    }
  };

  const handleNext = () => {
    const uploadData = rows.map(row => ({
      Name: row.Name,
      Subject: row.Subject,
      Classes: row.Classes,
    }));
    
    // Save the data for future use
    saveFacultyData(uploadData, fileName);
    console.log("Faculty data saved for future auto-fill");
    
    onUpload(uploadData);
  };

  // Show auto-fill prompt if we have saved data
  if (showAutoFill) {
    return (
      <AutoFillPrompt 
        onUseData={handleAutoFillUse}
        onSkip={handleAutoFillSkip}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 bg-card rounded-xl p-8 shadow border">
      <h2 className="text-xl font-semibold mb-2">Upload Faculty Allocation</h2>
      <div className="mb-2 text-muted-foreground">
        Upload a <span className="font-semibold">.csv</span> file with columns: Faculty Name | Subject | Classes (comma separated)
      </div>
      <input
        type="file"
        accept=".csv"
        ref={fileInput}
        onChange={handleFiles}
        className="mb-2"
      />
      {error && <div className="text-red-500">{error}</div>}
      {rows.length > 0 && (
        <div className="overflow-x-auto mt-6 mb-4">
          <table className="min-w-full border text-sm shadow">
            <thead className="bg-secondary border-b">
              <tr>
                <th className="px-4 py-2 text-left">Faculty Name</th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Class</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-4 py-2">{row.Name}</td>
                  <td className="px-4 py-2">{row.Subject}</td>
                  <td className="px-4 py-2">{row.Classes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => fileInput.current?.value && (fileInput.current.value = "")}>
          Clear
        </Button>
        <Button onClick={handleNext} disabled={rows.length === 0}>
          Next: Configure
        </Button>
      </div>
    </div>
  );
};

export default UploadAllocation;
