export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="d-sm-flex align-items-center justify-content-between mb-4">
      <div>
        <h1 className="h3 mb-0 text-gray-800">{title}</h1>
        {subtitle ? <div className="small text-muted mt-1">{subtitle}</div> : null}
      </div>
      {actions}
    </div>
  );
}
