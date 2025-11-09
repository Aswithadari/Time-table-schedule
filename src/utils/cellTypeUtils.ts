
import { CellType } from "@/types/downloadTypes";

export function getCellType(val: string): CellType {
  if (!val || val === "-" || val === "Free") return "free";
  if (val.toLowerCase().includes("lab")) return "lab";
  if (
    ["yoga", "mentor", "sports", "mentoring", "games", "library"].some(t =>
      val.toLowerCase().includes(t)
    )
  )
    return "special";
  if (val.toLowerCase() === "lunch") return "lunch";
  return "normal";
}

export const PDF_COLORS: Record<CellType, string> = {
  normal: "#ffffff",
  lab: "#e9d5ff", // Tailwind purple-200
  free: "#f4f4f5", // Tailwind muted (gray-100)
  special: "#a7f3d0", // Tailwind emerald-200
  lunch: "#fef08a", // Tailwind yellow-200
  unfilled: "#f4f4f5"
};
