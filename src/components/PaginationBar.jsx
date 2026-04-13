export default function PaginationBar({ page = 1, hasNext = false, onPrevious, onNext, summary = "" }) {
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <div className="small text-muted">{summary || `Trang ${page}`}</div>
      <div>
        <button type="button" className="btn btn-outline-secondary btn-sm mr-2" disabled={page <= 1} onClick={onPrevious}>
          Trước
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!hasNext} onClick={onNext}>
          Sau
        </button>
      </div>
    </div>
  );
}
