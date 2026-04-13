export default function EmptyState({ text = "No data found." }) {
  return <div className="text-center text-muted py-4">{text}</div>;
}
