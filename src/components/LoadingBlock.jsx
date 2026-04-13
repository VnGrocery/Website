export default function LoadingBlock({ text = "Đang tải..." }) {
  return (
    <div className="text-center py-4">
      <div className="spinner-border text-primary mb-3" role="status" aria-hidden="true" />
      <div className="small text-muted">{text}</div>
    </div>
  );
}
