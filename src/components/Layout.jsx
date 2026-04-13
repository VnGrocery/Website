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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = useMemo(
    () => [
      { to: "/", label: "Dashboard", icon: "tachometer-alt", end: true },
      { to: "/users", label: "Users", icon: "users-cog" },
      { to: "/shops", label: "Shops", icon: "store-alt" },
      { to: "/events", label: "Events", icon: "stream" },
      { to: "/account", label: "Account", icon: "user-cog" },
      { to: "/tools", label: "Tools", icon: "shield-alt" },
    ],
    [],
  );

  useEffect(() => {
    document.body.classList.toggle("sidebar-toggled", sidebarCollapsed);
    return () => {
      document.body.classList.remove("sidebar-toggled");
    };
  }, [sidebarCollapsed]);

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
            >
              <i className={`fas fa-fw fa-${item.icon}`} />
              <span>{item.label}</span>
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
            <div className="mr-auto">
              <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Operations Console</div>
              <div className="h5 mb-0 text-gray-800">
                {location.pathname.startsWith("/events") ? "Audit and verification" : "Admin control panel"}
              </div>
            </div>
            <div className="ml-auto d-flex align-items-center topbar-user-block">
              <span className="badge badge-primary badge-pill px-3 py-2 mr-3">API: {session.apiBaseUrl}</span>
              <div className="topbar-divider d-none d-sm-block" />
              <div className="nav-item dropdown no-arrow d-flex align-items-center">
                <div className="mr-3 text-right d-none d-lg-inline">
                  <div className="small text-gray-500">Signed in</div>
                  <div className="font-weight-bold text-gray-800">{me?.email || session.email || "admin"}</div>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm ml-3" onClick={logout}>
                  Sign out
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
