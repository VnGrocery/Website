import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { shopStatuses } from "../lib/constants.js";
import { roundNumber } from "../lib/format.js";

export default function ShopsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, page: 1, hasNext: false });

  const filters = {
    q: searchParams.get("q") || "",
    status: searchParams.get("status") || "",
    page: Number(searchParams.get("page") || "1"),
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get("/admin/shops", {
          page: filters.page,
          pageSize: 12,
          q: filters.q,
          status: filters.status,
        });
        if (active) {
          setState({
            loading: false,
            error: "",
            items: response.items || [],
            total: response.total || 0,
            page: response.page || 1,
            hasNext: Boolean(response.hasNext),
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, items: [], total: 0, page: 1, hasNext: false });
        }
      }
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    load();
    return () => {
      active = false;
    };
  }, [api, searchParams.toString()]);

  return (
    <>
      <PageHeader title="Shops" subtitle="Search and moderate shops" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Filters">
            <div className="form-row align-items-end">
              <div className="col-md-5 mb-3">
                <label>Search</label>
                <input
                  className="form-control"
                  value={filters.q}
                  onChange={(event) => setSearchParams(compactQuery({ ...filters, q: event.target.value, page: 1 }))}
                  placeholder="shop name or address"
                />
              </div>
              <div className="col-md-3 mb-3">
                <label>Status</label>
                <select
                  className="form-control"
                  value={filters.status}
                  onChange={(event) => setSearchParams(compactQuery({ ...filters, status: event.target.value, page: 1 }))}
                >
                  <option value="">All</option>
                  {shopStatuses.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card title={`Shops (${state.total})`} loading={state.loading}>
            <div className="row">
              {state.items.map((shop) => (
                <div className="col-xl-4 col-md-6 mb-4" key={shop.shopId}>
                  <div className="card border-left-primary shadow h-100 py-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">{shop.name}</div>
                          <div className="text-gray-800 small">{shop.address || "No address"}</div>
                        </div>
                        <StatusBadge value={shop.status} />
                      </div>
                      <div className="small mb-2">Owner: {shop.ownerUserId}</div>
                      <div className="small mb-2">Trust: {roundNumber(shop.trustSummary?.score)} / {shop.trustSummary?.grade || "n/a"}</div>
                      <div className="small mb-3">High risk checks: {shop.trustSummary?.highRiskCheckCount || 0}</div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/shops/${shop.shopId}`)}>
                        Open detail
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!state.loading && !state.items.length ? <EmptyState text="No shops matched the current filters." /> : null}

            <PaginationBar
              page={state.page}
              hasNext={state.hasNext}
              onPrevious={() => setSearchParams(compactQuery({ ...filters, page: Math.max(state.page - 1, 1) }))}
              onNext={() => setSearchParams(compactQuery({ ...filters, page: state.page + 1 }))}
              summary={`Page ${state.page}, total ${state.total} shops`}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function compactQuery(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}
