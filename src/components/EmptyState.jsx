export default function EmptyState({ text = "Không có dữ liệu." }) {
  return <div className="text-center text-muted py-4">{text}</div>;
}
