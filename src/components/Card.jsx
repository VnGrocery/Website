export default function Card({ title, loading = false, actions = null, children }) {
  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary">{title}</h6>
        <div className="d-flex align-items-center">
          {actions}
          {loading ? <span className="badge badge-light ml-2">Loading</span> : null}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}
