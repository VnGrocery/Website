import { toneOf } from "../lib/format.js";

export default function StatusBadge({ value, tone }) {
  return <span className={`badge badge-${tone || toneOf(value)}`}>{value}</span>;
}
