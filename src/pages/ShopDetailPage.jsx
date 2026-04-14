import { useEffect, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { labelOf, productStatuses, reportStatuses, shopStatuses } from "../lib/constants.js";
import { formatDateTime, roundNumber, shortText } from "../lib/format.js";
import { localizeProofAction, localizeProofHeadline, localizeProofSummary } from "../lib/proofI18n.js";

const MODERATION_REQUEST_OPTIONS = { timeoutMs: 45000, retryCount: 1, retryUnsafe: true };
const PROOF_REQUEST_OPTIONS = { timeoutMs: 30000, retryCount: 1 };
const PROOF_AUTO_REFRESH_INTERVAL_MS = 5000;
const PROOF_AUTO_REFRESH_WINDOW_MS = 90000;

export default function ShopDetailPage() {
  const api = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { me } = useOutletContext() || {};
  const isAdmin = String(me?.role || "").toLowerCase() === "admin";
  const { shopId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    shop: null,
    products: [],
    pledges: [],
    pledgeProof: null,
    reportsByProduct: {},
    reviews: [],
    saving: "",
    proofAutoRefreshPledgeId: "",
    proofAutoRefreshUntil: 0,
  });

  async function loadShopDetail() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [shop, productsResponse, pledgesResponse, reviewsResponse] = await Promise.all([
        api.get(`/shops/${shopId}`),
        api.get(`/shops/${shopId}/products`),
        api.get(`/shops/${shopId}/pledges`),
        api.get(`/shops/${shopId}/reviews`),
      ]);

      const reportEntries = await Promise.all(
        (productsResponse.items || []).map(async (product) => {
          try {
            const reportsResponse = await api.get(`/shops/${shopId}/products/${product.productId}/freshness-reports`);
            return [product.productId, reportsResponse.items || []];
          } catch {
            return [product.productId, []];
          }
        }),
      );

      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        shop,
        products: productsResponse.items || [],
        pledges: pledgesResponse.items || [],
        pledgeProof: current.pledgeProof,
        reportsByProduct: Object.fromEntries(reportEntries),
        reviews: Array.isArray(reviewsResponse) ? reviewsResponse : [],
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  useEffect(() => {
    loadShopDetail();
  }, [shopId]);

  const focusPledgeId = searchParams.get("focusPledgeId") || "";

  useEffect(() => {
    if (!focusPledgeId) {
      return;
    }
    if (!state.pledges.length) {
      return;
    }
    const exists = state.pledges.some((item) => item.pledgeId === focusPledgeId);
    if (!exists) {
      return;
    }
    if (state.pledgeProof?.pledgeId === focusPledgeId) {
      return;
    }
    viewProof(focusPledgeId);
  }, [focusPledgeId, state.pledges, state.pledgeProof?.pledgeId]);

  async function moderateShop(status, moderationNote) {
    if (!state.shop?.version) {
      setState((current) => ({ ...current, error: "Hệ thống chưa trả về phiên bản hiện tại của cửa hàng nên chưa thể duyệt an toàn." }));
      return;
    }
    const allowed = await confirm({
      title: "Xác nhận kiểm duyệt cửa hàng",
      message: `Chuyển trạng thái cửa hàng sang ${labelOf(status)}?`,
      confirmLabel: "Áp dụng",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: "shop", error: "" }));
    try {
      const shop = await api.patch(`/admin/shops/${shopId}/moderation`, {
        expectedVersion: state.shop.version,
        status,
        moderationNote,
      }, MODERATION_REQUEST_OPTIONS);
      setState((current) => ({ ...current, saving: "", shop }));
      toast.success("Đã cập nhật kiểm duyệt cửa hàng");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function moderateProduct(product, status, moderationNote) {
    const allowed = await confirm({
      title: "Xác nhận kiểm duyệt sản phẩm",
      message: `Chuyển sản phẩm ${product.name} sang ${labelOf(status)}?`,
      confirmLabel: "Áp dụng",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: product.productId, error: "" }));
    try {
      const updated = await api.patch(`/admin/products/${product.productId}/moderation`, {
        expectedVersion: product.version,
        status,
        moderationNote,
      }, MODERATION_REQUEST_OPTIONS);
      setState((current) => ({
        ...current,
        saving: "",
        products: current.products.map((item) => (item.productId === updated.productId ? updated : item)),
      }));
      toast.success("Đã cập nhật kiểm duyệt sản phẩm");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function moderateReport(report, status, moderationNote) {
    const allowed = await confirm({
      title: "Xác nhận kiểm duyệt báo cáo",
      message: `Chuyển báo cáo ${report.reportId} sang ${labelOf(status)}?`,
      confirmLabel: "Áp dụng",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: report.reportId, error: "" }));
    try {
      const updated = await api.patch(`/admin/product-freshness-reports/${report.reportId}/moderation`, {
        expectedVersion: report.version,
        status,
        moderationNote,
      }, MODERATION_REQUEST_OPTIONS);
      setState((current) => ({
        ...current,
        saving: "",
        reportsByProduct: {
          ...current.reportsByProduct,
          [updated.productId]: (current.reportsByProduct[updated.productId] || []).map((item) =>
            item.reportId === updated.reportId ? updated : item,
          ),
        },
      }));
      toast.success("Đã cập nhật báo cáo độ tươi");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function viewProof(pledgeId, silent = false) {
    if (!silent) {
      setState((current) => ({ ...current, saving: `proof:${pledgeId}`, error: "" }));
    }
    try {
      const pledgeProof = await api.get(`/shops/${shopId}/pledges/${pledgeId}/proof`, undefined, PROOF_REQUEST_OPTIONS);
      setState((current) => ({
        ...current,
        saving: silent ? current.saving : "",
        pledgeProof,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: silent ? current.saving : "",
        error: silent ? current.error : error.message,
      }));
    }
  }

  useEffect(() => {
    const pledgeId = state.proofAutoRefreshPledgeId;
    const until = Number(state.proofAutoRefreshUntil || 0);
    if (!pledgeId || !until || Date.now() >= until) {
      return;
    }
    const proof = state.pledgeProof;
    if (!proof || proof.pledgeId !== pledgeId) {
      return;
    }
    const status = String(proof.proofStatus || "").toLowerCase();
    if (!["unknown", "pending"].includes(status)) {
      return;
    }

    const timer = window.setTimeout(() => {
      viewProof(pledgeId, true);
    }, PROOF_AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [state.proofAutoRefreshPledgeId, state.proofAutoRefreshUntil, state.pledgeProof?.pledgeId, state.pledgeProof?.proofStatus]);

  async function runIntegrityAction(pledge, mode) {
    const allowed = await confirm({
      title: `Xác nhận ${labelOf(mode).toLowerCase()}`,
      message: `${labelOf(mode)} cho cam kết ${pledge.pledgeId}?`,
      confirmLabel: "Xác nhận",
      confirmTone: mode === "revoke" ? "danger" : "success",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: `${mode}:${pledge.pledgeId}`, error: "" }));
    try {
      const endpoint =
        mode === "reanchor"
          ? `/admin/shops/${shopId}/pledges/${pledge.pledgeId}/reanchor`
          : `/admin/shops/${shopId}/pledges/${pledge.pledgeId}/revoke`;
      const updated = await api.post(endpoint, { expectedVersion: pledge.version });
      setState((current) => ({
        ...current,
        saving: "",
        pledges: current.pledges.map((item) => (item.pledgeId === updated.pledgeId ? updated : item)),
        proofAutoRefreshPledgeId: mode === "reanchor" ? updated.pledgeId : current.proofAutoRefreshPledgeId,
        proofAutoRefreshUntil: mode === "reanchor" ? Date.now() + PROOF_AUTO_REFRESH_WINDOW_MS : current.proofAutoRefreshUntil,
      }));
      toast.success(`Đã ${labelOf(mode).toLowerCase()} cho cam kết`);
      if (mode === "reanchor") {
        viewProof(updated.pledgeId, true);
      }
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  return (
    <>
      <PageHeader title={state.shop?.name || shopId} subtitle="Xem và duyệt cửa hàng, sản phẩm, đánh giá và dữ liệu đối chiếu" />
      {!isAdmin ? <AlertBanner tone="info" text="Tài khoản hiện tại chỉ có quyền xem, không có quyền duyệt." /> : null}
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Duyệt cửa hàng" loading={state.loading}>
            {state.shop ? (
              <ActionForm
                currentValue={state.shop.status}
                options={shopStatuses}
                buttonLabel={state.saving === "shop" ? "Đang lưu..." : "Áp dụng kiểm duyệt"}
                disabled={!isAdmin || state.saving === "shop" || !state.shop.version}
                summary={[
                  ["Chủ sở hữu", state.shop.ownerUserId],
                  ["Mức tin cậy", `${roundNumber(state.shop.trustSummary?.score)} / ${state.shop.trustSummary?.grade || "Chưa có"}`],
                  ["Trạng thái hiện tại", labelOf(state.shop.status)],
                  ["Đánh giá", `${roundNumber(state.shop.ratingSummary?.averageRating)} (${state.shop.ratingSummary?.ratingCount || 0})`],
                ]}
                onSubmit={({ value, note }) => moderateShop(value, note)}
              />
            ) : null}
            {!state.shop?.version ? <div className="small text-warning mt-3">Hệ thống chưa trả về `version` của cửa hàng nên tạm thời khóa thao tác duyệt cửa hàng.</div> : null}
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Đánh giá" loading={state.loading}>
            <DataTable
              columns={["Người đánh giá", "Điểm", "Trạng thái", "Cập nhật", "Bình luận"]}
              rows={state.reviews.map((review) => [
                review.reviewerUserId,
                review.rating,
                <StatusBadge key={`${review.reviewId}-status`} value={review.status} />,
                formatDateTime(review.updatedAt),
                review.comment || "Không có bình luận",
              ])}
              emptyText="Không có đánh giá cho cửa hàng này."
            />
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Sản phẩm" loading={state.loading}>
            {state.products.map((product) => (
              <div className="card shadow-sm mb-3" key={product.productId}>
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="m-0 font-weight-bold text-primary">{product.name}</h6>
                    <div className="small text-muted">{product.category || "Không có danh mục"}</div>
                  </div>
                  <StatusBadge value={product.status} />
                </div>
                <div className="card-body">
                  <ActionForm
                    currentValue={product.status}
                    options={productStatuses}
                    buttonLabel={state.saving === product.productId ? "Đang lưu..." : "Áp dụng kiểm duyệt sản phẩm"}
                    disabled={!isAdmin || state.saving === product.productId}
                    summary={[
                      ["Độ tươi", roundNumber(product.freshnessScore)],
                      ["Giá", `${roundNumber(product.price)} ${product.currency || ""}`],
                      ["Nhãn", (product.tags || []).join(", ") || "không có"],
                    ]}
                    onSubmit={({ value, note }) => moderateProduct(product, value, note)}
                  />

                  <hr />

                  <h6 className="font-weight-bold text-gray-800 mb-3">Báo cáo độ tươi</h6>
                  {(state.reportsByProduct[product.productId] || []).map((report) => (
                    <div className="border rounded p-3 mb-3 bg-light" key={report.reportId}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="font-weight-bold text-gray-900">{report.reportId}</div>
                            <div className="small text-muted">{report.comment || "Không có bình luận"}</div>
                        </div>
                        <StatusBadge value={report.status} />
                      </div>
                      <ActionForm
                        currentValue={report.status}
                        options={reportStatuses}
                        buttonLabel={state.saving === report.reportId ? "Đang lưu..." : "Áp dụng kiểm duyệt báo cáo"}
                        disabled={!isAdmin || state.saving === report.reportId}
                        summary={[
                          ["Điểm", roundNumber(report.score)],
                          ["Danh mục", report.category || "Chưa có"],
                          ["Độ tin cậy", roundNumber(report.confidence)],
                          ["Cập nhật", formatDateTime(report.updatedAt)],
                        ]}
                        onSubmit={({ value, note }) => moderateReport(report, value, note)}
                      />
                    </div>
                  ))}
                  {!(state.reportsByProduct[product.productId] || []).length ? <div className="small text-muted">Không có báo cáo độ tươi cho sản phẩm này.</div> : null}
                </div>
              </div>
            ))}
            {!state.loading && !state.products.length ? <EmptyState text="Cửa hàng này chưa có sản phẩm." /> : null}
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Cam kết và bằng chứng" loading={state.loading}>
            <div className="row">
              {state.pledges.map((pledge) => (
                <div className="col-lg-6 mb-4" key={pledge.pledgeId}>
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="font-weight-bold text-info text-uppercase small">{pledge.pledgeId}</div>
                        <StatusBadge value={pledge.integrityStatus} />
                      </div>
                      <div className="small mb-1">Danh mục: {pledge.category}</div>
                      <div className="small mb-1">Điểm: {roundNumber(pledge.score)}</div>
                      <div className="small mb-1">Đã ghi nhận: {pledge.chainAnchorStatus || "Chưa có"}</div>
                      <div className="small mb-1">Tạo bởi: {pledge.createdByUserId}</div>
                      <div className="small mb-3">Mã dữ liệu: {shortText(pledge.dataHash)}</div>
                      <div className="btn-group btn-group-sm flex-wrap">
                        <button type="button" className="btn btn-outline-primary" onClick={() => viewProof(pledge.pledgeId)}>Xem bằng chứng</button>
                        <button type="button" className="btn btn-outline-success" disabled={!isAdmin} onClick={() => runIntegrityAction(pledge, "reanchor")}>Ghi nhận lại</button>
                        <button type="button" className="btn btn-outline-danger" disabled={!isAdmin} onClick={() => runIntegrityAction(pledge, "revoke")}>Hủy cam kết</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!state.loading && !state.pledges.length ? <EmptyState text="Cửa hàng này chưa có lịch sử cam kết." /> : null}

            {state.pledgeProof ? (
              <div className="card border-left-success shadow mt-3">
                <div className="card-body">
                  <h6 className="font-weight-bold text-success text-uppercase mb-2">{localizeProofHeadline(state.pledgeProof)}</h6>
                  <p className="mb-3">{localizeProofSummary(state.pledgeProof)}</p>
                  <div className="small mb-1">Tình trạng dữ liệu: {state.pledgeProof.integrity?.integrityStatus || "Chưa có"}</div>
                  <div className="small mb-1">Tình trạng ghi nhận: {state.pledgeProof.integrity?.chainAnchorStatus || "Chưa có"}</div>
                  <div className="small mb-3">Lý do chưa khớp: {state.pledgeProof.integrity?.mismatchReason || "không có"}</div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mb-3"
                    disabled={state.saving === `proof:${state.pledgeProof.pledgeId}`}
                    onClick={() => viewProof(state.pledgeProof.pledgeId)}
                  >
                    {state.saving === `proof:${state.pledgeProof.pledgeId}` ? "Đang kiểm tra..." : "Kiểm tra lại ngay"}
                  </button>
                  <div className="d-flex flex-wrap">
                    {(state.pledgeProof.recommendedActions || []).map((item) => (
                      <span className="badge badge-light border mr-2 mb-2" key={item}>{localizeProofAction(item)}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}

function ActionForm({ currentValue, options, buttonLabel, disabled, summary, onSubmit }) {
  const [value, setValue] = useState(currentValue || options[0] || "");
  const [note, setNote] = useState("");

  useEffect(() => {
    setValue(currentValue || options[0] || "");
  }, [currentValue, options]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ value, note });
      }}
    >
      <div className="row mb-3">
        {summary.map(([label, content]) => (
          <div className="col-md-3 mb-2" key={label}>
            <div className="small text-muted">{label}</div>
            <div className="font-weight-bold text-gray-800">{content}</div>
          </div>
        ))}
      </div>
      <div className="form-row align-items-end">
        <div className="col-md-3 mb-3">
          <label>Trạng thái</label>
          <select className="form-control" value={value} onChange={(event) => setValue(event.target.value)}>
            {options.map((option) => (
              <option key={option} value={option}>{labelOf(option)}</option>
            ))}
          </select>
        </div>
        <div className="col-md-7 mb-3">
          <label>Ghi chú xử lý</label>
          <textarea className="form-control" rows="2" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="col-md-2 mb-3">
          <button type="submit" className="btn btn-outline-primary btn-block" disabled={disabled}>
            {buttonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
