import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import { getCellType } from "@/utils/cellTypeUtils";

interface DraggableTimetableCellProps {
  cell: string;
  day: string;
  period: number;
  className: string;
  isTimeSlot: boolean;
  isBreakLunch: boolean;
  isDraggable: boolean;
}

export const DraggableTimetableCell = ({
  cell,
  day,
  period,
  className,
  isTimeSlot,
  isBreakLunch,
  isDraggable,
}: DraggableTimetableCellProps) => {
  const cellId = `${className}-${day}-${period}`;
  const cellType = getCellType(cell);

  // Set up draggable
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: cellId,
    data: {
      day,
      period,
      subject: cell,
      className,
      isBreakLunch,
    },
    disabled: !isDraggable,
  });

  // Set up droppable
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${cellId}`,
    data: {
      day,
      period,
      subject: cell,
      className,
      isBreakLunch,
    },
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        minWidth: isTimeSlot ? "50px" : "70px",
        maxWidth: isTimeSlot ? "50px" : "100px",
      }
    : {
        minWidth: isTimeSlot ? "50px" : "70px",
        maxWidth: isTimeSlot ? "50px" : "100px",
      };

  // Combine refs for both draggable and droppable
  const setRefs = (element: HTMLElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <TableCell
      ref={setRefs}
      className={`border-2 border-border px-1 py-1 text-center text-xs h-8 transition-colors ${
        isTimeSlot
          ? "bg-timetable-time font-semibold"
          : isBreakLunch
          ? "bg-timetable-break font-semibold"
          : cellType === "lab"
          ? "bg-timetable-lab"
          : cellType === "special"
          ? "bg-timetable-special"
          : cellType === "free"
          ? "bg-timetable-free"
          : "bg-timetable-normal"
      } ${isDraggable ? "cursor-move hover:bg-timetable-hover" : ""} ${
        isOver && isDraggable ? "ring-2 ring-ring bg-timetable-drag-over" : ""
      }`}
      style={style}
      {...attributes}
      {...listeners}
    >
      {isDraggable ? (
        <div className="flex items-center justify-center gap-1">
          <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <div className="break-words text-xs leading-tight truncate flex-1">
            {cell}
          </div>
        </div>
      ) : (
        <div className="break-words text-xs leading-tight truncate">{cell}</div>
      )}
    </TableCell>
  );
};
