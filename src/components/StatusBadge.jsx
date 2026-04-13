import { toneOf } from "../lib/format.js";
import { labelOf } from "../lib/constants.js";

export default function StatusBadge({ value, tone }) {
  return <span className={`badge badge-${tone || toneOf(value)}`}>{labelOf(value)}</span>;
}
