import { useNavigate } from "react-router-dom";

export default function PageHeader({
  title,
  subtitle,
  actions = null,
  showBack = false,
  backTo = "",
  backFallback = "/",
  backLabel = "Quay lại",
}) {
  const navigate = useNavigate();

  function goBack() {
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backFallback);
  }

  return (
    <div className="d-sm-flex align-items-start align-items-sm-center justify-content-between mb-4">
      <div className="mb-3 mb-sm-0">
        {showBack ? (
          <button type="button" className="btn btn-outline-secondary btn-sm mb-2 page-back-button" onClick={goBack}>
            <i className="fas fa-arrow-left mr-2" />
            {backLabel}
          </button>
        ) : null}
        <h1 className="h3 mb-0 text-gray-800">{title}</h1>
        {subtitle ? <div className="small text-muted mt-1">{subtitle}</div> : null}
      </div>
      {actions}
    </div>
  );
}
