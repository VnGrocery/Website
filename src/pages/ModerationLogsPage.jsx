import { useEffect, useMemo, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import { SkeletonBlock } from "../components/Skeleton.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { formatDateTime, fromDatetimeLocalInput, toDatetimeLocalInput } from "../lib/format.js";

const defaultFilters = {
  actorUserId: "",
  resourceType: "",
  status: "",
  createdAfter: "",
  createdBefore: "",
  page: "1",
};

export default function ModerationLogsPage() {
  const api = useApi();
  const [filters, setFilters] = useState(defaultFilters);
  const [state, setState] = useState({ loading: true, error: "", items: [], pagination: null });

  const query = useMemo(() => ({
    resourceType: filters.resourceType,
    actorUserId: filters.actorUserId,
    status: filters.status,
    action: filters.resourceType === "buyer_check" ? "buyer_check.moderated" : filters.resourceType === "product_freshness_report" ? "product_freshness_report.moderated" : "",
    createdAfter: fromDatetimeLocalInput(filters.createdAfter),
    createdBefore: fromDatetimeLocalInput(filters.createdBefore),
    page: Number(filters.page || "1"),
    pageSize: 20,
  }), [filters]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get("/events", query);
        if (!active) return;
        setState({
          loading: false,
          error: "",
          items: response.items || [],
          pagination: response.pagination || null,
        });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, error: error.message, items: [], pagination: null });
      }
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    load();
    return () => {
      active = false;
    };
  }, [api, query]);

  return (
    <>
      <PageHeader title="Lịch sử duyệt" subtitle="Theo dõi thao tác moderation theo admin, thời gian và trạng thái" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Bộ lọc">
            <div className="form-row align-items-end">
              <FilterInput label="Admin (actorUserId)" value={filters.actorUserId} onChange={(actorUserId) => setFilters((current) => ({ ...current, actorUserId, page: "1" }))} />
              <div className="col-md-3 mb-3">
                <label>Loại dữ liệu</label>
                <select className="form-control" value={filters.resourceType} onChange={(event) => setFilters((current) => ({ ...current, resourceType: event.target.value, page: "1" }))}>
                  <option value="">Tất cả</option>
                  <option value="buyer_check">Buyer check</option>
                  <option value="product_freshness_report">Freshness report</option>
                </select>
              </div>
              <FilterInput label="Trạng thái" value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status, page: "1" }))} />
            </div>
            <div className="form-row align-items-end">
              <DateFilter label="Từ" value={filters.createdAfter} onChange={(createdAfter) => setFilters((current) => ({ ...current, createdAfter, page: "1" }))} />
              <DateFilter label="Đến" value={filters.createdBefore} onChange={(createdBefore) => setFilters((current) => ({ ...current, createdBefore, page: "1" }))} />
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-outline-secondary btn-block" onClick={() => setFilters(defaultFilters)}>Đặt lại</button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Dòng thời gian moderation" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Admin</th>
                    <th>Mục</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {state.loading ? (
                    <LoadingRows columns={5} rows={8} />
                  ) : (
                    state.items.map((event) => {
                      const payload = safeParse(event.payloadJson);
                      const note = payload?.after?.moderationNote || payload?.moderationNote || "";
                      return (
                        <tr key={event.eventId}>
                          <td>{formatDateTime(event.createdAt)}</td>
                          <td>{event.actorUserId}</td>
                          <td>
                            <div className="font-weight-bold">{event.resourceType}</div>
                            <div className="small text-muted">{event.resourceId}</div>
                          </td>
                          <td><StatusBadge value={event.status} /></td>
                          <td>{note || "(không có)"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {!state.loading && !state.items.length ? <EmptyState text="Không có bản ghi moderation nào." /> : null}
            </div>
            <PaginationBar
              page={Number(filters.page || "1")}
              hasNext={Boolean(state.pagination && state.pagination.page < state.pagination.totalPages)}
              onPrevious={() => setFilters((current) => ({ ...current, page: String(Math.max(Number(current.page || "1") - 1, 1)) }))}
              onNext={() => setFilters((current) => ({ ...current, page: String(Number(current.page || "1") + 1) }))}
              summary={state.pagination ? `Trang ${state.pagination.page} / ${state.pagination.totalPages}, tổng ${state.pagination.totalItems} bản ghi` : ""}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function safeParse(value) {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function FilterInput({ label, value, onChange }) {
  return (
    <div className="col-md-3 mb-3">
      <label>{label}</label>
      <input className="form-control" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="col-md-2 mb-3">
      <label>{label}</label>
      <input className="form-control" type="datetime-local" value={toDatetimeLocalInput(value)} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function LoadingRows({ columns, rows }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={`loading-row-${rowIndex}`}>
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td key={`loading-cell-${rowIndex}-${columnIndex}`}>
          <SkeletonBlock height={12} width={`${82 - ((rowIndex + columnIndex) % 3) * 12}%`} />
        </td>
      ))}
    </tr>
  ));
}
