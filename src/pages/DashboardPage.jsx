import { useEffect, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";
import { formatDateTime, roundNumber } from "../lib/format.js";

export default function DashboardPage() {
  const api = useApi();
  const [state, setState] = useState({ loading: true, error: "", users: [], shops: [] });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [usersResponse, shopsResponse] = await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/shops", { page: 1, pageSize: 8 }),
        ]);
        if (active) {
          setState({
            loading: false,
            error: "",
            users: usersResponse.items || [],
            shops: shopsResponse.items || [],
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, users: [], shops: [] });
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [api]);

  const activeUsers = state.users.filter((item) => item.status === "active").length;
  const pendingShops = state.shops.filter((item) => item.status === "pending").length;
  const riskFlags = state.shops.filter((item) => (item.trustSummary?.highRiskCheckCount || 0) > 0).length;
  const anchored = state.shops.filter((item) => item.trustSummary?.latestPledgeId).length;

  return (
    <>
      <PageHeader title="Tổng quan" subtitle="Nhìn nhanh tình hình chung của hệ thống" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <MetricCard color="primary" title="Người dùng" value={state.users.length} hint={`${activeUsers} đang hoạt động`} icon="users" />
        <MetricCard color="success" title="Cửa hàng" value={state.shops.length} hint={`${pendingShops} đang chờ duyệt`} icon="store" />
        <MetricCard color="warning" title="Cần xem lại" value={riskFlags} hint="Có lượt kiểm tra rủi ro cao" icon="exclamation-triangle" />
        <MetricCard color="info" title="Có cam kết" value={anchored} hint="Cửa hàng đã có dữ liệu đối chiếu" icon="link" />
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Người dùng gần đây" loading={state.loading}>
            <DataTable
              columns={["Email", "Vai trò", "Trạng thái", "Cập nhật"]}
              rows={state.users.slice(0, 6).map((user) => [
                user.email,
                <StatusBadge key={`${user.userId}-role`} value={user.role} tone="secondary" />,
                <StatusBadge key={`${user.userId}-status`} value={user.status} />,
                formatDateTime(user.updatedAt),
              ])}
              emptyText="Không tìm thấy người dùng"
            />
          </Card>
        </div>
        <div className="col-lg-6 mb-4">
          <Card title="Cửa hàng cần chú ý" loading={state.loading}>
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
          </Card>
        </div>
      </div>
    </>
  );
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
