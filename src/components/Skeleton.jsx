function repeat(count) {
  return Array.from({ length: count }, (_, index) => index);
}

export function SkeletonBlock({ height = 14, width = "100%", className = "" }) {
  return <div className={`skeleton-react ${className}`.trim()} style={{ height, width }} aria-hidden="true" />;
}

export function SkeletonTable({ columns = 4, rows = 5 }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead>
          <tr>
            {repeat(columns).map((index) => (
              <th key={`head-${index}`}>
                <SkeletonBlock height={12} width={`${70 - (index % 3) * 10}%`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {repeat(rows).map((rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {repeat(columns).map((columnIndex) => (
                <td key={`cell-${rowIndex}-${columnIndex}`}>
                  <SkeletonBlock height={12} width={`${80 - ((rowIndex + columnIndex) % 3) * 12}%`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonMetricCards({ count = 4 }) {
  return repeat(count).map((index) => (
    <div className="col-xl-3 col-md-6 mb-4" key={`metric-${index}`}>
      <div className="card shadow h-100 py-2">
        <div className="card-body">
          <SkeletonBlock height={10} width="45%" className="mb-2" />
          <SkeletonBlock height={20} width="35%" className="mb-3" />
          <SkeletonBlock height={10} width="65%" />
        </div>
      </div>
    </div>
  ));
}

export function SkeletonShopCards({ count = 6 }) {
  return repeat(count).map((index) => (
    <div className="col-xl-4 col-md-6 mb-4" key={`shop-${index}`}>
      <div className="card border-left-primary shadow h-100 py-2">
        <div className="card-body">
          <SkeletonBlock height={11} width="50%" className="mb-2" />
          <SkeletonBlock height={11} width="75%" className="mb-2" />
          <SkeletonBlock height={10} width="65%" className="mb-2" />
          <SkeletonBlock height={10} width="55%" className="mb-2" />
          <SkeletonBlock height={10} width="40%" className="mb-3" />
          <SkeletonBlock height={30} width="120px" />
        </div>
      </div>
    </div>
  ));
}

export function SkeletonBars({ count = 7 }) {
  return (
    <div>
      {repeat(count).map((index) => (
        <div className="mb-2" key={`bar-${index}`}>
          <div className="small d-flex justify-content-between mb-1">
            <SkeletonBlock height={10} width="90px" />
            <SkeletonBlock height={10} width="24px" />
          </div>
          <SkeletonBlock height={16} width={`${85 - (index % 4) * 12}%`} />
        </div>
      ))}
    </div>
  );
}
