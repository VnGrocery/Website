import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import AlertBanner from "./AlertBanner.jsx";
import { useApi } from "../lib/api.jsx";
import { useSession } from "../lib/session.jsx";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApi();
  const { session, clearSession } = useSession();
  const [me, setMe] = useState(null);
  const [bootError, setBootError] = useState("");
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [alerts, setAlerts] = useState({ highRiskChecks: 0, pendingReports: 0 });

  const navItems = useMemo(
    () => [
      { to: "/", label: "Tổng quan", icon: "tachometer-alt", end: true },
      { to: "/users", label: "Người dùng", icon: "users-cog" },
      { to: "/shops", label: "Cửa hàng", icon: "store-alt" },
      { to: "/buyer-checks", label: "Lượt kiểm tra khách", icon: "clipboard-check", badge: alerts.highRiskChecks },
      { to: "/freshness-reports", label: "Báo cáo độ tươi", icon: "vial", badge: alerts.pendingReports },
      { to: "/moderation-logs", label: "Lịch sử duyệt", icon: "history" },
      { to: "/events", label: "Lịch sử thay đổi", icon: "stream" },
      { to: "/account", label: "Tài khoản", icon: "user-cog" },
    ],
    [alerts.highRiskChecks, alerts.pendingReports],
  );
  const currentNavLabel =
    navItems.find((item) => location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to)))?.label ||
    (location.pathname.startsWith("/tools") ? "Xử lý kỹ thuật" : "") ||
    "Trang quản trị";

  useEffect(() => {
    document.body.classList.toggle("sidebar-toggled", sidebarCollapsed);
    return () => {
      document.body.classList.remove("sidebar-toggled");
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    function syncViewportFlags() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    }
    syncViewportFlags();
    window.addEventListener("resize", syncViewportFlags);
    return () => {
      window.removeEventListener("resize", syncViewportFlags);
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const profile = await api.get("/me");
        if (active) {
          setMe(profile);
          setBootError("");
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setBootError(error.message);
        if (error.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [api, clearSession, navigate]);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      try {
        const [checks, reports] = await Promise.all([
          api.get("/admin/buyer-checks", { verdict: "high_risk", status: "completed", page: 1, pageSize: 1 }),
          api.get("/admin/product-freshness-reports", { status: "active", page: 1, pageSize: 1 }),
        ]);
        if (!active) return;
        const highRiskChecks = checks.pagination?.totalItems || 0;
        const pendingReports = reports.pagination?.totalItems || 0;

        setAlerts({ highRiskChecks, pendingReports });
      } catch {
        if (!active) return;
        setAlerts({ highRiskChecks: 0, pendingReports: 0 });
      }
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, [api, location.pathname]);

  async function logout() {
    try {
      if (session.refreshToken) {
        await api.post("/auth/logout", { refreshToken: session.refreshToken });
      }
    } catch {
      // ignore logout API failure and clear local session anyway
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div id="wrapper">
      <ul className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion ${sidebarCollapsed ? "toggled" : ""}`}>
        <button
          type="button"
          className="sidebar-brand d-flex align-items-center justify-content-center border-0 bg-transparent"
          onClick={() => navigate("/")}
        >
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-store" />
          </div>
          <div className="sidebar-brand-text mx-3">VNGrocery Admin</div>
        </button>

        <hr className="sidebar-divider my-0" />

        {navItems.map((item) => (
          <li className="nav-item" key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              onClick={() => {
                if (isMobile) {
                  setSidebarCollapsed(true);
                }
              }}
            >
              <i className={`fas fa-fw fa-${item.icon}`} />
              <span>{item.label}</span>
              {item.badge > 0 ? <span className="badge badge-warning ml-2">{item.badge}</span> : null}
            </NavLink>
          </li>
        ))}

        <hr className="sidebar-divider d-none d-md-block" />
      </ul>

      <div id="content-wrapper" className="d-flex flex-column">
        <div id="content">
          <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
            <button
              type="button"
              className="btn btn-link d-md-inline rounded-circle mr-3"
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              <i className="fa fa-bars" />
            </button>
            <div className="mr-auto topbar-heading">
              <div className="h6 mb-0 font-weight-bold text-gray-800">{currentNavLabel}</div>
              <div className="small text-muted">VNGrocery Admin</div>
            </div>
            <div className="ml-auto d-flex align-items-center topbar-user-block flex-shrink-0">
              <span className="badge badge-primary badge-pill px-3 py-2 mr-2 d-none d-sm-inline-block">API: {session.apiBaseUrl}</span>
              <div className="topbar-divider d-none d-sm-block" />
              <div className="nav-item dropdown no-arrow d-flex align-items-center">
                <div className="mr-3 text-right d-none d-lg-inline">
                  <div className="small text-gray-500">Đang đăng nhập</div>
                  <div className="font-weight-bold text-gray-800">{me?.email || session.email || "admin"}</div>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm ml-2 ml-sm-3 topbar-logout-button" onClick={logout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          </nav>

          <div className="container-fluid">
            {bootError ? <AlertBanner tone="danger" text={bootError} /> : null}
            <Outlet context={{ me }} />
          </div>
        </div>

        <footer className="sticky-footer bg-white">
          <div className="container my-auto">
            <div className="copyright text-center my-auto">
              <span>VNGrocery Admin Web</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
