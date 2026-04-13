import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { labelOf, reportStatuses } from "../lib/constants.js";
import { downloadCsv, downloadJson } from "../lib/export.js";
import { formatDateTime, fromDatetimeLocalInput, roundNumber, toDatetimeLocalInput } from "../lib/format.js";
import { useToast } from "../components/ToastStack.jsx";

const defaultFilters = {
  reportId: "",
  reporterUserId: "",
  shopId: "",
  productId: "",
  status: "",
  createdAfter: "",
  createdBefore: "",
  page: "1",
};

export default function FreshnessReportsPage() {
  const api = useApi();
  const toast = useToast();
  const { me } = useOutletContext() || {};
  const isAdmin = String(me?.role || "").toLowerCase() === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => ({ ...defaultFilters, ...Object.fromEntries(searchParams.entries()) }), [searchParams]);
  const [state, setState] = useState({ loading: true, error: "", items: [], pagination: null, selected: [], applying: false });
  const [bulk, setBulk] = useState({ status: "flagged", note: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get("/admin/product-freshness-reports", {
          reportId: filters.reportId,
          shopId: filters.shopId,
          productId: filters.productId,
          reporterUserId: filters.reporterUserId,
          status: filters.status,
          createdAfter: fromDatetimeLocalInput(filters.createdAfter),
          createdBefore: fromDatetimeLocalInput(filters.createdBefore),
          page: Number(filters.page || "1"),
          pageSize: 20,
        });
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: "",
          items: response.items || [],
          pagination: response.pagination || null,
          selected: current.selected.filter((id) => (response.items || []).some((item) => item.reportId === id)),
        }));
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, loading: false, error: error.message, items: [], pagination: null, selected: [] }));
      }
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    load();

    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, filters.reportId, filters.reporterUserId, filters.shopId, filters.productId, filters.status, filters.createdAfter, filters.createdBefore, filters.page]);

  async function moderateOne(item, status, moderationNote) {
    setState((current) => ({ ...current, applying: true, error: "" }));
    try {
      const updated = await patchReportWithRetry(api, item, { status, moderationNote });
      setState((current) => ({
        ...current,
        applying: false,
        items: current.items.map((row) => (row.reportId === item.reportId ? { ...row, ...updated } : row)),
      }));
      toast.success(`Đã cập nhật ${item.reportId} -> ${labelOf(status)}`);
    } catch (error) {
      setState((current) => ({ ...current, applying: false, error: error.message }));
    }
  }

  async function applyBulkModeration() {
    const targets = state.items.filter((item) => state.selected.includes(item.reportId));
    if (!targets.length) return;
    setState((current) => ({ ...current, applying: true, error: "" }));
    try {
      const updates = await Promise.all(
        targets.map(async (item) => {
          const updated = await patchReportWithRetry(api, item, { status: bulk.status, moderationNote: bulk.note });
          return { reportId: item.reportId, updated };
        }),
      );
      const updateMap = new Map(updates.map((entry) => [entry.reportId, entry.updated]));
      setState((current) => ({
        ...current,
        applying: false,
        selected: [],
        items: current.items.map((item) => (updateMap.has(item.reportId) ? { ...item, ...updateMap.get(item.reportId) } : item)),
      }));
      toast.success(`Đã duyệt ${updates.length} báo cáo độ tươi`);
    } catch (error) {
      setState((current) => ({ ...current, applying: false, error: error.message }));
    }
  }

  function toggleSelected(reportId) {
    setState((current) => ({
      ...current,
      selected: current.selected.includes(reportId)
        ? current.selected.filter((id) => id !== reportId)
        : [...current.selected, reportId],
    }));
  }

  const suggestionNote = suggestReportNoteForStatus(bulk.status);

  return (
    <>
      <PageHeader
        title="Báo cáo độ tươi"
        subtitle="Danh sách chung các lượt freshness report trên toàn hệ thống"
        actions={
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadCsv(
                  `freshness-reports-page-${filters.page || "1"}.csv`,
                  ["reportId", "shopId", "productId", "reporterUserId", "status", "score", "category", "confidence", "comment", "createdAt"],
                  state.items.map((item) => [
                    item.reportId,
                    item.shopId,
                    item.productId,
                    item.reporterUserId,
                    item.status,
                    item.score,
                    item.category,
                    item.confidence,
                    item.comment,
                    item.createdAt,
                  ]),
                )
              }
            >
              Xuất CSV
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => downloadJson(`freshness-reports-page-${filters.page || "1"}.json`, state.items)}>
              Xuất JSON
            </button>
          </div>
        }
      />
      <AlertBanner tone="danger" text={state.error} />
      {!isAdmin ? <AlertBanner tone="info" text="Tài khoản hiện tại chỉ có quyền xem, không có quyền duyệt." /> : null}

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Bộ lọc">
            <div className="form-row align-items-end">
              <FilterInput label="Mã báo cáo" value={filters.reportId} onChange={(reportId) => setSearchParams(compactQuery({ ...filters, reportId, page: "1" }))} />
              <FilterInput label="Người báo cáo" value={filters.reporterUserId} onChange={(reporterUserId) => setSearchParams(compactQuery({ ...filters, reporterUserId, page: "1" }))} />
              <FilterInput label="Cửa hàng" value={filters.shopId} onChange={(shopId) => setSearchParams(compactQuery({ ...filters, shopId, page: "1" }))} />
              <FilterInput label="Sản phẩm" value={filters.productId} onChange={(productId) => setSearchParams(compactQuery({ ...filters, productId, page: "1" }))} />
            </div>
            <div className="form-row align-items-end">
              <div className="col-md-2 mb-3">
                <label>Trạng thái</label>
                <select className="form-control" value={filters.status} onChange={(event) => setSearchParams(compactQuery({ ...filters, status: event.target.value, page: "1" }))}>
                  <option value="">Tất cả</option>
                  {reportStatuses.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
                </select>
              </div>
              <DateFilter label="Từ" value={filters.createdAfter} onChange={(createdAfter) => setSearchParams(compactQuery({ ...filters, createdAfter, page: "1" }))} />
              <DateFilter label="Đến" value={filters.createdBefore} onChange={(createdBefore) => setSearchParams(compactQuery({ ...filters, createdBefore, page: "1" }))} />
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-outline-secondary btn-block" onClick={() => setSearchParams(defaultFilters)}>Đặt lại</button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Duyệt hàng loạt" loading={state.loading}>
            <div className="form-row align-items-end">
              <div className="col-md-3 mb-3">
                <label>Trạng thái áp dụng</label>
                <select className="form-control" value={bulk.status} onChange={(event) => setBulk((current) => ({ ...current, status: event.target.value }))}>
                  {reportStatuses.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
                </select>
              </div>
              <div className="col-md-5 mb-3">
                <label>Ghi chú</label>
                <input className="form-control" value={bulk.note} onChange={(event) => setBulk((current) => ({ ...current, note: event.target.value }))} placeholder={suggestionNote} />
              </div>
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-outline-info btn-block" onClick={() => setBulk((current) => ({ ...current, note: suggestionNote }))}>Gợi ý note</button>
              </div>
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-primary btn-block" disabled={!isAdmin || !state.selected.length || state.applying} onClick={applyBulkModeration}>
                  {state.applying ? "Đang áp dụng..." : `Áp dụng ${state.selected.length} mục`}
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Danh sách báo cáo" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={state.items.length > 0 && state.selected.length === state.items.length}
                        onChange={(event) => setState((current) => ({ ...current, selected: event.target.checked ? current.items.map((item) => item.reportId) : [] }))}
                      />
                    </th>
                    <th>Mã báo cáo</th>
                    <th>Liên kết</th>
                    <th>Trạng thái</th>
                    <th>Điểm</th>
                    <th>Nội dung</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((item) => (
                    <tr key={item.reportId}>
                      <td><input type="checkbox" checked={state.selected.includes(item.reportId)} onChange={() => toggleSelected(item.reportId)} /></td>
                      <td>
                        <div className="font-weight-bold">{item.reportId}</div>
                        <div className="small text-muted">user: {item.reporterUserId || "-"}</div>
                      </td>
                      <td>
                        {item.shopId ? <Link to={`/shops/${item.shopId}`}>Shop</Link> : "-"}
                        <div className="small text-muted">product: {item.productId || "-"}</div>
                      </td>
                      <td><StatusBadge value={item.status || "active"} /></td>
                      <td>
                        {roundNumber(item.score)}
                        <div className="small text-muted">{item.category || "-"}, conf {roundNumber(item.confidence)}</div>
                      </td>
                      <td>{item.comment || "Không có"}</td>
                      <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                      <td>
                        <div className="btn-group btn-group-sm flex-wrap">
                          <button type="button" className="btn btn-outline-warning" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "flagged", "flagged after admin review")}>Gắn cờ</button>
                          <button type="button" className="btn btn-outline-danger" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "rejected", "rejected due to invalid or risky report")}>Từ chối</button>
                          <button type="button" className="btn btn-outline-success" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "active", "re-activated after verification")}>Kích hoạt</button>
                          <Link className="btn btn-outline-primary" to={`/tools?reportId=${encodeURIComponent(item.reportId)}&reportExpectedVersion=${item.version || 1}`}>Duyệt chi tiết</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!state.loading && !state.items.length ? (
                    <tr><td colSpan="8" className="text-center text-muted py-4">Chưa có báo cáo nào phù hợp bộ lọc.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={Number(filters.page || "1")}
              hasNext={Boolean(state.pagination && state.pagination.page < state.pagination.totalPages)}
              onPrevious={() => setSearchParams(compactQuery({ ...filters, page: String(Math.max(Number(filters.page || "1") - 1, 1)) }))}
              onNext={() => setSearchParams(compactQuery({ ...filters, page: String(Number(filters.page || "1") + 1) }))}
              summary={state.pagination ? `Trang ${state.pagination.page} / ${state.pagination.totalPages}, tổng ${state.pagination.totalItems} báo cáo` : ""}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

async function patchReportWithRetry(api, item, input) {
  try {
    return await api.patch(`/admin/product-freshness-reports/${item.reportId}/moderation`, {
      expectedVersion: Number(item.version || 1),
      status: input.status,
      moderationNote: input.moderationNote || "",
    });
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("version conflict")) {
      throw error;
    }
    const latest = await api.get("/admin/product-freshness-reports", { reportId: item.reportId, page: 1, pageSize: 1 });
    const latestVersion = latest.items?.[0]?.version || item.version || 1;
    return api.patch(`/admin/product-freshness-reports/${item.reportId}/moderation`, {
      expectedVersion: Number(latestVersion),
      status: input.status,
      moderationNote: input.moderationNote || "",
    });
  }
}

function suggestReportNoteForStatus(status) {
  if (status === "flagged") return "flagged after admin review";
  if (status === "rejected") return "rejected due to invalid or risky report";
  return "re-activated after verification";
}

function compactQuery(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined && value !== null));
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
