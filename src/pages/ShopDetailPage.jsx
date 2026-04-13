import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { productStatuses, reportStatuses, shopStatuses } from "../lib/constants.js";
import { formatDateTime, roundNumber, shortText } from "../lib/format.js";

export default function ShopDetailPage() {
  const api = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { shopId = "" } = useParams();
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

  async function moderateShop(status, moderationNote) {
    if (!state.shop?.version) {
      setState((current) => ({ ...current, error: "Backend is not returning shop version, moderation cannot be submitted safely." }));
      return;
    }
    const allowed = await confirm({
      title: "Confirm shop moderation",
      message: `Change shop status to ${status}?`,
      confirmLabel: "Apply",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: "shop", error: "" }));
    try {
      const shop = await api.patch(`/admin/shops/${shopId}/moderation`, {
        expectedVersion: state.shop.version,
        status,
        moderationNote,
      });
      setState((current) => ({ ...current, saving: "", shop }));
      toast.success("Shop moderation updated");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function moderateProduct(product, status, moderationNote) {
    const allowed = await confirm({
      title: "Confirm product moderation",
      message: `Change product ${product.name} to ${status}?`,
      confirmLabel: "Apply",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: product.productId, error: "" }));
    try {
      const updated = await api.patch(`/admin/products/${product.productId}/moderation`, {
        expectedVersion: product.version,
        status,
        moderationNote,
      });
      setState((current) => ({
        ...current,
        saving: "",
        products: current.products.map((item) => (item.productId === updated.productId ? updated : item)),
      }));
      toast.success("Product moderation updated");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function moderateReport(report, status, moderationNote) {
    const allowed = await confirm({
      title: "Confirm report moderation",
      message: `Change report ${report.reportId} to ${status}?`,
      confirmLabel: "Apply",
      confirmTone: "warning",
    });
    if (!allowed) return;

    setState((current) => ({ ...current, saving: report.reportId, error: "" }));
    try {
      const updated = await api.patch(`/admin/product-freshness-reports/${report.reportId}/moderation`, {
        expectedVersion: report.version,
        status,
        moderationNote,
      });
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
      toast.success("Freshness report updated");
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function viewProof(pledgeId) {
    setState((current) => ({ ...current, saving: `proof:${pledgeId}`, error: "" }));
    try {
      const pledgeProof = await api.get(`/shops/${shopId}/pledges/${pledgeId}/proof`);
      setState((current) => ({ ...current, saving: "", pledgeProof }));
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  async function runIntegrityAction(pledge, mode) {
    const allowed = await confirm({
      title: `Confirm ${mode}`,
      message: `${mode} integrity for pledge ${pledge.pledgeId}?`,
      confirmLabel: mode,
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
      }));
      toast.success(`Pledge ${mode} completed`);
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: error.message }));
    }
  }

  return (
    <>
      <PageHeader title={state.shop?.name || shopId} subtitle="Shop moderation, products, reviews and proof" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Shop moderation" loading={state.loading}>
            {state.shop ? (
              <ActionForm
                currentValue={state.shop.status}
                options={shopStatuses}
                buttonLabel={state.saving === "shop" ? "Saving..." : "Apply moderation"}
                disabled={state.saving === "shop" || !state.shop.version}
                summary={[
                  ["Owner", state.shop.ownerUserId],
                  ["Trust", `${roundNumber(state.shop.trustSummary?.score)} / ${state.shop.trustSummary?.grade || "n/a"}`],
                  ["Current status", state.shop.status],
                  ["Rating", `${roundNumber(state.shop.ratingSummary?.averageRating)} (${state.shop.ratingSummary?.ratingCount || 0})`],
                ]}
                onSubmit={({ value, note }) => moderateShop(value, note)}
              />
            ) : null}
            {!state.shop?.version ? <div className="small text-warning mt-3">Shop version is missing from backend response. Shop moderation is disabled until backend exposes `version`.</div> : null}
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Reviews" loading={state.loading}>
            <DataTable
              columns={["Reviewer", "Rating", "Status", "Updated", "Comment"]}
              rows={state.reviews.map((review) => [
                review.reviewerUserId,
                review.rating,
                <StatusBadge key={`${review.reviewId}-status`} value={review.status} />,
                formatDateTime(review.updatedAt),
                review.comment || "No comment",
              ])}
              emptyText="No reviews for this shop."
            />
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Products" loading={state.loading}>
            {state.products.map((product) => (
              <div className="card shadow-sm mb-3" key={product.productId}>
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="m-0 font-weight-bold text-primary">{product.name}</h6>
                    <div className="small text-muted">{product.category || "No category"}</div>
                  </div>
                  <StatusBadge value={product.status} />
                </div>
                <div className="card-body">
                  <ActionForm
                    currentValue={product.status}
                    options={productStatuses}
                    buttonLabel={state.saving === product.productId ? "Saving..." : "Apply product moderation"}
                    disabled={state.saving === product.productId}
                    summary={[
                      ["Freshness", roundNumber(product.freshnessScore)],
                      ["Price", `${roundNumber(product.price)} ${product.currency || ""}`],
                      ["Tags", (product.tags || []).join(", ") || "none"],
                    ]}
                    onSubmit={({ value, note }) => moderateProduct(product, value, note)}
                  />

                  <hr />

                  <h6 className="font-weight-bold text-gray-800 mb-3">Freshness reports</h6>
                  {(state.reportsByProduct[product.productId] || []).map((report) => (
                    <div className="border rounded p-3 mb-3 bg-light" key={report.reportId}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="font-weight-bold text-gray-900">{report.reportId}</div>
                          <div className="small text-muted">{report.comment || "No comment"}</div>
                        </div>
                        <StatusBadge value={report.status} />
                      </div>
                      <ActionForm
                        currentValue={report.status}
                        options={reportStatuses}
                        buttonLabel={state.saving === report.reportId ? "Saving..." : "Apply report moderation"}
                        disabled={state.saving === report.reportId}
                        summary={[
                          ["Score", roundNumber(report.score)],
                          ["Category", report.category || "n/a"],
                          ["Confidence", roundNumber(report.confidence)],
                          ["Updated", formatDateTime(report.updatedAt)],
                        ]}
                        onSubmit={({ value, note }) => moderateReport(report, value, note)}
                      />
                    </div>
                  ))}
                  {!(state.reportsByProduct[product.productId] || []).length ? <div className="small text-muted">No freshness reports for this product.</div> : null}
                </div>
              </div>
            ))}
            {!state.loading && !state.products.length ? <EmptyState text="This shop has no products." /> : null}
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Pledges and proof" loading={state.loading}>
            <div className="row">
              {state.pledges.map((pledge) => (
                <div className="col-lg-6 mb-4" key={pledge.pledgeId}>
                  <div className="card border-left-info shadow h-100 py-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="font-weight-bold text-info text-uppercase small">{pledge.pledgeId}</div>
                        <StatusBadge value={pledge.integrityStatus} />
                      </div>
                      <div className="small mb-1">Category: {pledge.category}</div>
                      <div className="small mb-1">Score: {roundNumber(pledge.score)}</div>
                      <div className="small mb-1">Anchor: {pledge.chainAnchorStatus || "n/a"}</div>
                      <div className="small mb-1">Created by: {pledge.createdByUserId}</div>
                      <div className="small mb-3">Hash: {shortText(pledge.dataHash)}</div>
                      <div className="btn-group btn-group-sm flex-wrap">
                        <button type="button" className="btn btn-outline-primary" onClick={() => viewProof(pledge.pledgeId)}>View proof</button>
                        <button type="button" className="btn btn-outline-success" onClick={() => runIntegrityAction(pledge, "reanchor")}>Reanchor</button>
                        <button type="button" className="btn btn-outline-danger" onClick={() => runIntegrityAction(pledge, "revoke")}>Revoke</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!state.loading && !state.pledges.length ? <EmptyState text="No pledge history for this shop." /> : null}

            {state.pledgeProof ? (
              <div className="card border-left-success shadow mt-3">
                <div className="card-body">
                  <h6 className="font-weight-bold text-success text-uppercase mb-2">{state.pledgeProof.proofHeadline}</h6>
                  <p className="mb-3">{state.pledgeProof.proofSummary}</p>
                  <div className="small mb-1">Integrity status: {state.pledgeProof.integrity?.integrityStatus || "n/a"}</div>
                  <div className="small mb-1">Chain anchor: {state.pledgeProof.integrity?.chainAnchorStatus || "n/a"}</div>
                  <div className="small mb-3">Mismatch reason: {state.pledgeProof.integrity?.mismatchReason || "none"}</div>
                  <div className="d-flex flex-wrap">
                    {(state.pledgeProof.recommendedActions || []).map((item) => (
                      <span className="badge badge-light border mr-2 mb-2" key={item}>{item}</span>
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
          <label>Status</label>
          <select className="form-control" value={value} onChange={(event) => setValue(event.target.value)}>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="col-md-7 mb-3">
          <label>Moderation note</label>
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
