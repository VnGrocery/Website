import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { buyerCheckStatuses, labelOf } from "../lib/constants.js";
import { downloadCsv, downloadJson } from "../lib/export.js";
import { formatDateTime, fromDatetimeLocalInput, roundNumber, toDatetimeLocalInput } from "../lib/format.js";
import { useToast } from "../components/ToastStack.jsx";

const defaultFilters = {
  checkId: "",
  buyerUserId: "",
  shopId: "",
  productId: "",
  status: "",
  verdict: "",
  createdAfter: "",
  createdBefore: "",
  page: "1",
};
const MODERATION_REQUEST_OPTIONS = { timeoutMs: 45000, retryCount: 1, retryUnsafe: true };

export default function BuyerChecksPage() {
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
        const response = await api.get("/admin/buyer-checks", {
          checkId: filters.checkId,
          shopId: filters.shopId,
          productId: filters.productId,
          buyerUserId: filters.buyerUserId,
          status: filters.status,
          verdict: filters.verdict,
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
          selected: current.selected.filter((id) => (response.items || []).some((item) => item.checkId === id)),
        }));
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, loading: false, error: describeModerationError(error), items: [], pagination: null, selected: [] }));
      }
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    load();

    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, filters.checkId, filters.shopId, filters.productId, filters.buyerUserId, filters.status, filters.verdict, filters.createdAfter, filters.createdBefore, filters.page]);

  async function moderateOne(item, status, moderationNote) {
    setState((current) => ({ ...current, applying: true, error: "" }));
    try {
      const updated = await patchBuyerCheckWithRetry(api, item, { status, moderationNote });
      setState((current) => ({
        ...current,
        applying: false,
        items: current.items.map((row) => (row.checkId === item.checkId ? { ...row, ...updated } : row)),
      }));
      toast.success(`Đã cập nhật ${item.checkId} -> ${labelOf(status)}`);
    } catch (error) {
      setState((current) => ({ ...current, applying: false, error: describeModerationError(error) }));
    }
  }

  async function applyBulkModeration() {
    const targets = state.items.filter((item) => state.selected.includes(item.checkId));
    if (!targets.length) return;

    setState((current) => ({ ...current, applying: true, error: "" }));
    try {
      const updates = await Promise.all(
        targets.map(async (item) => {
          const updated = await patchBuyerCheckWithRetry(api, item, {
            status: bulk.status,
            moderationNote: bulk.note,
          });
          return { checkId: item.checkId, updated };
        }),
      );
      const updateMap = new Map(updates.map((entry) => [entry.checkId, entry.updated]));
      setState((current) => ({
        ...current,
        applying: false,
        selected: [],
        items: current.items.map((item) => (updateMap.has(item.checkId) ? { ...item, ...updateMap.get(item.checkId) } : item)),
      }));
      toast.success(`Đã duyệt ${updates.length} lượt kiểm tra`);
    } catch (error) {
      setState((current) => ({ ...current, applying: false, error: describeModerationError(error) }));
    }
  }

  function toggleSelected(checkId) {
    setState((current) => ({
      ...current,
      selected: current.selected.includes(checkId)
        ? current.selected.filter((id) => id !== checkId)
        : [...current.selected, checkId],
    }));
  }

  const suggestionNote = suggestBuyerNoteForStatus(bulk.status);

  return (
    <>
      <PageHeader
        title="Lượt kiểm tra của khách"
        subtitle="Danh sách chung các lượt buyer check đã ghi nhận trên toàn hệ thống"
        actions={
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadCsv(
                  `buyer-checks-page-${filters.page || "1"}.csv`,
                  ["checkId", "shopId", "productId", "buyerUserId", "status", "verdict", "trusted", "actualScore", "pledgedScore", "scoreDeltaAbs", "reasons", "createdAt"],
                  state.items.map((item) => [
                    item.checkId,
                    item.shopId,
                    item.productId,
                    item.buyerUserId,
                    item.status,
                    item.verdict,
                    item.trusted,
                    item.actualScore,
                    item.pledgedScore,
                    item.scoreDeltaAbs,
                    (item.reasons || []).join("|"),
                    item.createdAt,
                  ]),
                )
              }
            >
              Xuất CSV
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => downloadJson(`buyer-checks-page-${filters.page || "1"}.json`, state.items)}>
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
              <FilterInput label="Mã check" value={filters.checkId} onChange={(checkId) => setSearchParams(compactQuery({ ...filters, checkId, page: "1" }))} />
              <FilterInput label="Người mua" value={filters.buyerUserId} onChange={(buyerUserId) => setSearchParams(compactQuery({ ...filters, buyerUserId, page: "1" }))} />
              <FilterInput label="Cửa hàng" value={filters.shopId} onChange={(shopId) => setSearchParams(compactQuery({ ...filters, shopId, page: "1" }))} />
              <FilterInput label="Sản phẩm" value={filters.productId} onChange={(productId) => setSearchParams(compactQuery({ ...filters, productId, page: "1" }))} />
            </div>
            <div className="form-row align-items-end">
              <div className="col-md-2 mb-3">
                <label>Trạng thái</label>
                <select className="form-control" value={filters.status} onChange={(event) => setSearchParams(compactQuery({ ...filters, status: event.target.value, page: "1" }))}>
                  <option value="">Tất cả</option>
                  {buyerCheckStatuses.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
                </select>
              </div>
              <div className="col-md-2 mb-3">
                <label>Kết luận</label>
                <select className="form-control" value={filters.verdict} onChange={(event) => setSearchParams(compactQuery({ ...filters, verdict: event.target.value, page: "1" }))}>
                  <option value="">Tất cả</option>
                  <option value="trusted">Đáng tin cậy</option>
                  <option value="warning">Cần chú ý</option>
                  <option value="high_risk">Rủi ro cao</option>
                  <option value="no_pledge">Không có pledge</option>
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
                  {buyerCheckStatuses.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
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
          <Card title="Danh sách lượt kiểm tra" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={state.items.length > 0 && state.selected.length === state.items.length}
                        onChange={(event) => setState((current) => ({ ...current, selected: event.target.checked ? current.items.map((item) => item.checkId) : [] }))}
                      />
                    </th>
                    <th>Mã check</th>
                    <th>Liên kết</th>
                    <th>Kết luận</th>
                    <th>Điểm</th>
                    <th>Lý do</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((item) => (
                    <tr key={item.checkId}>
                      <td><input type="checkbox" checked={state.selected.includes(item.checkId)} onChange={() => toggleSelected(item.checkId)} /></td>
                      <td>
                        <div className="font-weight-bold">{item.checkId}</div>
                        <div className="small text-muted">buyer: {item.buyerUserId || "-"}</div>
                      </td>
                      <td>
                        {item.shopId ? <Link to={`/shops/${item.shopId}`}>Shop</Link> : "-"}
                        {item.pledgeId && item.shopId ? <div className="small"><Link to={`/shops/${item.shopId}?focusPledgeId=${encodeURIComponent(item.pledgeId)}`}>Proof</Link></div> : null}
                        <div className="small text-muted">product: {item.productId || "-"}</div>
                      </td>
                      <td>
                        <StatusBadge value={item.status || "completed"} />
                        <div className="small mt-1">{labelVerdict(item.verdict, item.trusted)}</div>
                      </td>
                      <td>
                        {item.pledgeId ? `${roundNumber(item.actualScore)} / ${roundNumber(item.pledgedScore)}` : roundNumber(item.actualScore)}
                        <div className="small text-muted">Δ {roundNumber(item.scoreDeltaAbs)}</div>
                      </td>
                      <td>{(item.reasons || []).join(", ") || "Không có"}</td>
                      <td>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                      <td>
                        <div className="btn-group btn-group-sm flex-wrap">
                          <button type="button" className="btn btn-outline-warning" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "flagged", "flagged due to risk signals")}>Gắn cờ</button>
                          <button type="button" className="btn btn-outline-danger" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "rejected", "rejected after moderation review")}>Từ chối</button>
                          <button type="button" className="btn btn-outline-success" disabled={!isAdmin || state.applying} onClick={() => moderateOne(item, "completed", "confirmed after admin review")}>Hoàn tất</button>
                          <Link className="btn btn-outline-primary" to={`/tools?buyerCheckId=${encodeURIComponent(item.checkId)}&expectedVersion=${item.version || 1}`}>Mở công cụ nâng cao</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!state.loading && !state.items.length ? (
                    <tr><td colSpan="8" className="text-center text-muted py-4">Chưa có lượt kiểm tra nào phù hợp bộ lọc.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={Number(filters.page || "1")}
              hasNext={Boolean(state.pagination && state.pagination.page < state.pagination.totalPages)}
              onPrevious={() => setSearchParams(compactQuery({ ...filters, page: String(Math.max(Number(filters.page || "1") - 1, 1)) }))}
              onNext={() => setSearchParams(compactQuery({ ...filters, page: String(Number(filters.page || "1") + 1) }))}
              summary={state.pagination ? `Trang ${state.pagination.page} / ${state.pagination.totalPages}, tổng ${state.pagination.totalItems} lượt` : ""}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

async function patchBuyerCheckWithRetry(api, item, input) {
  try {
    return await api.patch(`/admin/buyer-checks/${item.checkId}/moderation`, {
      expectedVersion: Number(item.version || 1),
      status: input.status,
      moderationNote: input.moderationNote || "",
    }, MODERATION_REQUEST_OPTIONS);
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("version conflict")) {
      throw error;
    }
    const latest = await api.get("/admin/buyer-checks", { checkId: item.checkId, page: 1, pageSize: 1 }, { timeoutMs: 45000, retryCount: 1 });
    const latestVersion = latest.items?.[0]?.version || item.version || 1;
    return api.patch(`/admin/buyer-checks/${item.checkId}/moderation`, {
      expectedVersion: Number(latestVersion),
      status: input.status,
      moderationNote: input.moderationNote || "",
    }, MODERATION_REQUEST_OPTIONS);
  }
}

function compactQuery(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function labelVerdict(verdict, trusted) {
  if (trusted || verdict === "trusted") return "Đáng tin cậy";
  if (verdict === "high_risk") return "Rủi ro cao";
  if (verdict === "warning") return "Cần chú ý";
  if (verdict === "no_pledge") return "Không có cam kết đối chiếu";
  return verdict || "Chưa có";
}

function suggestBuyerNoteForStatus(status) {
  if (status === "flagged") return "flagged due to risk signals";
  if (status === "rejected") return "rejected after moderation review";
  return "confirmed after admin review";
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

function describeModerationError(error) {
  if (error?.status === 403) {
    return "Tai khoan hien tai khong co quyen duyet cac muc nay.";
  }
  if (error?.name === "TimeoutError") {
    return "Khong nhan duoc phan hoi tu server trong thoi gian cho phep.";
  }
  return error?.message || "Khong the xu ly yeu cau.";
}
