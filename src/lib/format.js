export function roundNumber(value, digits = 2) {
  return typeof value === "number" && !Number.isNaN(value) ? value.toFixed(digits) : "0.00";
}

export function formatDateTime(value) {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "n/a" : date.toLocaleString();
}

export function shortText(value, prefix = 8, suffix = 6) {
  if (!value) {
    return "n/a";
  }
  return value.length <= prefix + suffix + 3 ? value : `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}

export function toneOf(value) {
  if (["active", "completed", "verified", "trusted"].includes(value)) return "success";
  if (["pending", "draft"].includes(value)) return "warning";
  if (["flagged", "rejected", "revoked", "suspended", "disabled"].includes(value)) return "danger";
  return "secondary";
}

export function prettyJson(value) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function toDatetimeLocalInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
