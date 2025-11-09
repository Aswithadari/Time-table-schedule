
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { DownloadButtonProps } from "@/types/downloadTypes";
import DownloadDropdown from "./DownloadDropdown";

const DownloadButton = ({ type, items, activeIdx = 0, disabled, userDetails }: DownloadButtonProps) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="flex gap-2 items-center"
        disabled={!!disabled || !items.length}
        onClick={() => setOpen(!open)}
        title={`Download ${type === "class" ? "Class" : "Faculty"} Timetables`}
      >
        <Download className="inline" size={20} />
        Download {type === "class" ? "Class" : "Faculty"}
      </Button>
      {open && (
        <DownloadDropdown
          type={type}
          items={items}
          activeIdx={activeIdx}
          userDetails={userDetails}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default DownloadButton;
