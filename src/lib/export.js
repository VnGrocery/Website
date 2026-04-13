export function downloadJson(filename, data) {
  const content = JSON.stringify(data, null, 2);
  triggerDownload(filename, "application/json;charset=utf-8", content);
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map(escapeCsv).join(",");
  const body = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
  triggerDownload(filename, "text/csv;charset=utf-8", `${header}\n${body}`);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
