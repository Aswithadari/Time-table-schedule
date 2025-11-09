
import { DownloadButtonProps } from "@/types/downloadTypes";
import { generateExcelIndividual, generateExcelAllMerged } from "@/utils/excelUtils";
import { generatePdfIndividual, generatePdfAllMerged } from "@/utils/pdfUtils";

interface DownloadDropdownProps extends Pick<DownloadButtonProps, 'type' | 'items' | 'activeIdx' | 'userDetails'> {
  onClose: () => void;
}

const DownloadDropdown = ({ type, items, activeIdx = 0, userDetails, onClose }: DownloadDropdownProps) => {
  const handleExcelIndividual = () => {
    onClose();
    generateExcelIndividual(items, activeIdx, type);
  };

  const handleExcelAllMerged = () => {
    onClose();
    generateExcelAllMerged(items, type);
  };

  const handlePdfIndividual = () => {
    onClose();
    generatePdfIndividual(items, activeIdx, type, userDetails);
  };

  const handlePdfAllMerged = () => {
    onClose();
    generatePdfAllMerged(items, type, userDetails);
  };

  return (
    <div className="absolute right-0 mt-2 z-20 bg-white border rounded shadow w-56 min-w-[220px] text-sm">
      <div className="px-4 py-2 font-semibold text-muted-foreground">Download Options</div>
      <button
        className="w-full px-4 py-2 text-left hover:bg-accent"
        onClick={handleExcelIndividual}
      >
        This {type === "class" ? "Class" : "Faculty"} only (.xlsx)
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-accent"
        onClick={handlePdfIndividual}
      >
        This {type === "class" ? "Class" : "Faculty"} only (.pdf)
      </button>
      <div className="border-t my-1" />
      <button
        className="w-full px-4 py-2 text-left hover:bg-accent"
        onClick={handleExcelAllMerged}
      >
        All {type === "class" ? "Classes" : "Faculty"} (merged .xlsx)
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-accent"
        onClick={handlePdfAllMerged}
      >
        All {type === "class" ? "Classes" : "Faculty"} (merged .pdf)
      </button>
    </div>
  );
};

export default DownloadDropdown;
