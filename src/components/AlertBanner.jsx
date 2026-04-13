export default function AlertBanner({ tone = "secondary", text, compact = false }) {
  if (!text) {
    return null;
  }
  const klass =
    tone === "danger"
      ? "alert-danger"
      : tone === "success"
        ? "alert-success"
        : tone === "info"
          ? "alert-info"
          : "alert-secondary";

  return <div className={`alert ${klass} ${compact ? "py-2 mb-3" : ""}`}>{text}</div>;
}
