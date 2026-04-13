import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { formatDateTime, roundNumber } from "../lib/format.js";

const defaultFilters = {
  checkId: "",
  buyerUserId: "",
  page: "1",
};

export default function BuyerChecksPage() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => ({ ...defaultFilters, ...Object.fromEntries(searchParams.entries()) }), [searchParams]);
  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    pagination: null,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get("/events", {
          resourceType: "buyer_check",
          action: "buyer_check.completed",
          resourceId: filters.checkId,
          actorUserId: filters.buyerUserId,
          page: Number(filters.page || "1"),
          pageSize: 20,
        });

        if (!active) return;
        setState({
          loading: false,
          error: "",
          items: (response.items || []).map(extractBuyerCheck),
          pagination: response.pagination || null,
        });
      } catch (error) {
        if (!active) return;
        setState({
          loading: false,
          error: error.message,
          items: [],
          pagination: null,
        });
      }
    }

    setState((current) => ({ ...current, loading: true, error: "" }));
    load();
    return () => {
      active = false;
    };
  }, [api, filters.checkId, filters.buyerUserId, filters.page]);

  return (
    <>
      <PageHeader
        title="Lượt kiểm tra của khách"
        subtitle="Danh sách chung các lượt buyer check đã ghi nhận trên toàn hệ thống"
      />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Bộ lọc">
            <div className="form-row align-items-end">
              <div className="col-md-5 mb-3">
                <label>Mã lượt kiểm tra</label>
                <input
                  className="form-control"
                  value={filters.checkId}
                  onChange={(event) => setSearchParams(compactQuery({ ...filters, checkId: event.target.value, page: "1" }))}
                  placeholder="Nhập checkId"
                />
              </div>
              <div className="col-md-5 mb-3">
                <label>Mã người mua</label>
                <input
                  className="form-control"
                  value={filters.buyerUserId}
                  onChange={(event) => setSearchParams(compactQuery({ ...filters, buyerUserId: event.target.value, page: "1" }))}
                  placeholder="Nhập buyerUserId"
                />
              </div>
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-outline-secondary btn-block" onClick={() => setSearchParams(defaultFilters)}>
                  Đặt lại
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Danh sách lượt kiểm tra" loading={state.loading}>
            <DataTable
              columns={["Mã check", "Cửa hàng", "Sản phẩm", "Người mua", "Kết luận", "Điểm so sánh", "Lý do", "Thời gian", "Xử lý"]}
              rows={state.items.map((item) => [
                item.checkId,
                item.shopId || "Chưa có",
                item.productId || "Chưa có",
                item.buyerUserId || "Chưa có",
                <div key={`${item.checkId}-verdict`}>
                  <StatusBadge value={item.status || "completed"} />
                  <div className="small mt-1">{labelVerdict(item.verdict, item.trusted)}</div>
                </div>,
                item.hasPledge
                  ? `${roundNumber(item.actualScore)} / ${roundNumber(item.pledgedScore)} (Δ ${roundNumber(item.scoreDeltaAbs)})`
                  : `${roundNumber(item.actualScore)} (không có pledge)`,
                (item.reasons || []).join(", ") || "Không có",
                formatDateTime(item.createdAt),
                <Link
                  key={`${item.checkId}-moderate`}
                  className="btn btn-sm btn-outline-primary"
                  to={`/tools?buyerCheckId=${encodeURIComponent(item.checkId)}&expectedVersion=${item.version || 1}`}
                >
                  Duyệt nhanh
                </Link>,
              ])}
              emptyText="Chưa có lượt kiểm tra nào phù hợp bộ lọc."
            />

            <PaginationBar
              page={Number(filters.page || "1")}
              hasNext={Boolean(state.pagination && state.pagination.page < state.pagination.totalPages)}
              onPrevious={() =>
                setSearchParams(compactQuery({ ...filters, page: String(Math.max(Number(filters.page || "1") - 1, 1)) }))
              }
              onNext={() => setSearchParams(compactQuery({ ...filters, page: String(Number(filters.page || "1") + 1) }))}
              summary={
                state.pagination
                  ? `Trang ${state.pagination.page} / ${state.pagination.totalPages}, tổng ${state.pagination.totalItems} lượt`
                  : ""
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function extractBuyerCheck(event) {
  const payload = parseMaybeJson(event.payloadJson);
  const after = payload && typeof payload === "object" && payload.after && typeof payload.after === "object" ? payload.after : payload;
  const data = after && typeof after === "object" ? after : {};

  return {
    checkId: String(data.checkId || event.resourceId || ""),
    shopId: String(data.shopId || ""),
    productId: String(data.productId || ""),
    buyerUserId: String(data.buyerUserId || event.actorUserId || ""),
    status: String(data.status || event.status || "completed"),
    version: Number(data.version || event.resourceVersion || 1),
    verdict: String(data.verdict || ""),
    trusted: Boolean(data.trusted),
    hasPledge: Boolean(data.pledgeId),
    pledgedScore: Number(data.pledgedScore || 0),
    actualScore: Number(data.actualScore || 0),
    scoreDeltaAbs: Number(data.scoreDeltaAbs || 0),
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    createdAt: data.createdAt || event.createdAt,
  };
}

function parseMaybeJson(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch {
    return {};
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
