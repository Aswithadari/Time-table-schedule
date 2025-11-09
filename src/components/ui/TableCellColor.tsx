
type TableCellColorProps = {
  value: string;
  type: "normal" | "lab" | "free" | "special" | "lunch" | "unfilled";
};
const COLORS = {
  normal: "bg-white",
  lab: "bg-purple-200 font-semibold",
  free: "bg-muted",
  special: "bg-emerald-200 font-semibold",
  lunch: "bg-yellow-200 font-semibold",
  unfilled: "bg-red-200"
};
const TableCellColor = ({ value, type }: TableCellColorProps) => (
  <td className={`px-3 py-2 border text-center transition ${COLORS[type]}`}>
    {value === "UNFILLED" ? "" : (value || "-")}
  </td>
);
export default TableCellColor;
