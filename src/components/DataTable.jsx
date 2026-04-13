import EmptyState from "./EmptyState.jsx";

export default function DataTable({ columns, rows, emptyText = "No data found." }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`row-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${index}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState text={emptyText} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
