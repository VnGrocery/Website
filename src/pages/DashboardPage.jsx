import { useEffect, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonBars, SkeletonMetricCards, SkeletonTable } from "../components/Skeleton.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { userStatuses } from "../lib/constants.js";
import { formatDateTime, roundNumber } from "../lib/format.js";

export default function DashboardPage() {
  const api = useApi();
  const [state, setState] = useState({ loading: true, error: "", users: [], shops: [], highRiskChecks: [], pendingReports: [] });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [usersResponse, shopsResponse, checksResponse, reportsResponse] = await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/shops", { page: 1, pageSize: 8 }),
          api.get("/admin/buyer-checks", { verdict: "high_risk", status: "completed", page: 1, pageSize: 50 }),
          api.get("/admin/product-freshness-reports", { status: "active", page: 1, pageSize: 50 }),
        ]);
        if (active) {
          setState({
            loading: false,
            error: "",
            users: usersResponse.items || [],
            shops: shopsResponse.items || [],
            highRiskChecks: checksResponse.items || [],
            pendingReports: reportsResponse.items || [],
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, users: [], shops: [], highRiskChecks: [], pendingReports: [] });
        }
      }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api]);

  const activeUsers = state.users.filter((item) => normalizeUserStatus(item.status) === "active").length;
  const pendingShops = state.shops.filter((item) => item.status === "pending").length;
  const riskFlags = state.shops.filter((item) => (item.trustSummary?.highRiskCheckCount || 0) > 0).length;
  const anchored = state.shops.filter((item) => item.trustSummary?.latestPledgeId).length;
  const dailyCheckTrend = aggregateByDate(state.highRiskChecks.map((event) => event.updatedAt || event.createdAt), 7);
  const dailyReportTrend = aggregateByDate(state.pendingReports.map((event) => event.updatedAt || event.createdAt), 7);

  return (
    <>
      <PageHeader title="Tổng quan" subtitle="Nhìn nhanh tình hình chung của hệ thống" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        {state.loading ? (
          <SkeletonMetricCards count={6} />
        ) : (
          <>
            <MetricCard color="primary" title="Người dùng" value={state.users.length} hint={`${activeUsers} đang hoạt động`} icon="users" />
            <MetricCard color="success" title="Cửa hàng" value={state.shops.length} hint={`${pendingShops} đang chờ duyệt`} icon="store" />
            <MetricCard color="warning" title="Cần xem lại" value={riskFlags} hint="Có lượt kiểm tra rủi ro cao" icon="exclamation-triangle" />
            <MetricCard color="info" title="Có cam kết" value={anchored} hint="Cửa hàng đã có dữ liệu đối chiếu" icon="link" />
            <MetricCard color="danger" title="Buyer check rủi ro cao" value={state.highRiskChecks.length} hint="Cần ưu tiên xử lý" icon="shield-alt" />
            <MetricCard color="secondary" title="Freshness report chờ duyệt" value={state.pendingReports.length} hint="Đang ở trạng thái active" icon="vial" />
          </>
        )}
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Người dùng gần đây" loading={state.loading}>
            {state.loading ? (
              <SkeletonTable columns={4} rows={6} />
            ) : (
              <DataTable
                columns={["Email", "Vai trò", "Trạng thái", "Cập nhật"]}
                rows={state.users.slice(0, 6).map((user) => [
                  user.email,
                  <StatusBadge key={`${user.userId}-role`} value={user.role} tone="secondary" />,
                  <StatusBadge key={`${user.userId}-status`} value={normalizeUserStatus(user.status)} />,
                  formatDateTime(user.updatedAt),
                ])}
                emptyText="Không tìm thấy người dùng"
              />
            )}
          </Card>
        </div>
        <div className="col-lg-6 mb-4">
          <Card title="Cửa hàng cần chú ý" loading={state.loading}>
            {state.loading ? (
              <SkeletonTable columns={4} rows={6} />
            ) : (
              <DataTable
                columns={["Cửa hàng", "Trạng thái", "Mức tin cậy", "Rủi ro"]}
                rows={state.shops.slice(0, 6).map((shop) => [
                  shop.name,
                  <StatusBadge key={`${shop.shopId}-status`} value={shop.status} />,
                  `${roundNumber(shop.trustSummary?.score)} / ${shop.trustSummary?.grade || "Chưa có"}`,
                  `${shop.trustSummary?.highRiskCheckCount || 0} lượt`,
                ])}
                emptyText="Không tìm thấy cửa hàng"
              />
            )}
          </Card>
        </div>
        <div className="col-lg-6 mb-4">
          <Card title="Xu hướng buyer check rủi ro cao (7 ngày)">
            {state.loading ? <SkeletonBars count={7} /> : <TrendBars items={dailyCheckTrend} />}
          </Card>
        </div>
        <div className="col-lg-6 mb-4">
          <Card title="Xu hướng freshness report chờ duyệt (7 ngày)">
            {state.loading ? <SkeletonBars count={7} /> : <TrendBars items={dailyReportTrend} />}
          </Card>
        </div>
      </div>
    </>
  );
}

function normalizeUserStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (userStatuses.includes(normalized)) {
    return normalized;
  }
  return "active";
}

function MetricCard({ color, title, value, hint, icon }) {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className={`card border-left-${color} shadow h-100 py-2`}>
        <div className="card-body">
          <div className="row no-gutters align-items-center">
            <div className="col mr-2">
              <div className={`text-xs font-weight-bold text-${color} text-uppercase mb-1`}>{title}</div>
              <div className="h5 mb-0 font-weight-bold text-gray-800">{value}</div>
              <div className="small text-muted mt-2">{hint}</div>
            </div>
            <div className="col-auto">
              <i className={`fas fa-${icon} fa-2x text-gray-300`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendBars({ items }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div>
      {items.map((item) => (
        <div className="mb-2" key={item.day}>
          <div className="small d-flex justify-content-between">
            <span>{item.day}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="progress">
            <div className="progress-bar bg-info" role="progressbar" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function aggregateByDate(values, days) {
  const counts = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    counts.set(key, 0);
  }
  for (const value of values) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    }
  }
  return Array.from(counts.entries()).map(([day, count]) => ({ day, count }));
}
