import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:8080/v1`;

const SESSION_KEY = "vngrocery-admin-session";

const shopStatuses = ["active", "pending", "flagged", "suspended", "archived"];
const productStatuses = ["active", "draft", "flagged", "suspended", "archived"];
const userRoles = ["buyer", "seller", "admin"];
const userStatuses = ["active", "pending", "suspended", "disabled"];
const buyerCheckStatuses = ["completed", "flagged", "rejected"];
const reportStatuses = ["active", "flagged", "rejected"];

function App() {
  const [session, setSession] = useState(loadSession);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onAuthenticated={setSession} session={session} />} />
      <Route
        path="/*"
        element={
          <RequireSession session={session}>
            <AdminShell session={session} onSessionChange={setSession} />
          </RequireSession>
        }
      />
    </Routes>
  );
}

function RequireSession({ children, session }) {
  if (!session?.accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminShell({ session, onSessionChange }) {
  const navigate = useNavigate();
  const api = useMemo(() => createApiClient(session, onSessionChange), [session, onSessionChange]);
  const [me, setMe] = useState(null);
  const [bootError, setBootError] = useState("");

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
        const message = getErrorMessage(error);
        setBootError(message);
        if (message.toLowerCase().includes("unauthorized")) {
          onSessionChange(emptySession());
          navigate("/login", { replace: true });
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [api, navigate, onSessionChange]);

  function logout() {
    onSessionChange(emptySession());
    navigate("/login", { replace: true });
  }

  return (
    <div id="wrapper">
      <ul className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion">
        <a className="sidebar-brand d-flex align-items-center justify-content-center" href="/">
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-store" />
          </div>
          <div className="sidebar-brand-text mx-3">VNGrocery Admin</div>
        </a>

        <hr className="sidebar-divider my-0" />

        <li className="nav-item">
          <NavLink to="/" end className="nav-link">
            <i className="fas fa-fw fa-tachometer-alt" />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/users" className="nav-link">
            <i className="fas fa-fw fa-users-cog" />
            <span>Users</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/shops" className="nav-link">
            <i className="fas fa-fw fa-store-alt" />
            <span>Shops</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/tools" className="nav-link">
            <i className="fas fa-fw fa-shield-alt" />
            <span>Integrity Tools</span>
          </NavLink>
        </li>

        <hr className="sidebar-divider d-none d-md-block" />

        <div className="sidebar-card d-none d-lg-flex">
          <img className="sidebar-card-illustration mb-2" src="/img/undraw_profile.svg" alt="" />
          <p className="text-center mb-2">
            <strong>{me?.email || session.email || "admin"}</strong>
          </p>
          <button type="button" className="btn btn-light btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </ul>

      <div id="content-wrapper" className="d-flex flex-column">
        <div id="content">
          <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
            <div className="mr-auto">
              <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                Operations Console
              </div>
              <div className="h5 mb-0 text-gray-800">Admin control panel</div>
            </div>
            <div className="ml-auto d-flex align-items-center">
              <span className="badge badge-primary badge-pill px-3 py-2">
                API: {session.apiBaseUrl}
              </span>
            </div>
          </nav>

          <div className="container-fluid">
            {bootError ? <Alert tone="danger" text={bootError} /> : null}

            <Routes>
              <Route path="/" element={<DashboardPage api={api} />} />
              <Route path="/users" element={<UsersPage api={api} />} />
              <Route path="/shops" element={<ShopsPage api={api} />} />
              <Route path="/shops/:shopId" element={<ShopDetailPage api={api} />} />
              <Route path="/tools" element={<ToolsPage api={api} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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

function LoginPage({ onAuthenticated, session }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    apiBaseUrl: session?.apiBaseUrl || DEFAULT_API_BASE,
    email: session?.email || "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.accessToken) {
      navigate("/", { replace: true });
    }
  }, [navigate, session]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await request(`${form.apiBaseUrl}/auth/login`, {
        method: "POST",
        body: { email: form.email, password: form.password },
      });
      onAuthenticated({
        apiBaseUrl: form.apiBaseUrl.replace(/\/$/, ""),
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || "",
        userId: response.userId || "",
        email: response.email || form.email,
      });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gradient-primary login-page">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-7 col-md-9">
            <div className="card o-hidden border-0 shadow-lg my-5">
              <div className="card-body p-0">
                <div className="p-5">
                  <div className="text-center">
                    <h1 className="h4 text-gray-900 mb-4">VNGrocery Admin</h1>
                    <p className="mb-4">Đăng nhập bằng tài khoản admin để dùng web quản trị.</p>
                  </div>
                  <form className="user" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <input
                        className="form-control form-control-user"
                        type="text"
                        placeholder="API base URL"
                        value={form.apiBaseUrl}
                        onChange={(event) => setForm({ ...form, apiBaseUrl: event.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        className="form-control form-control-user"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        className="form-control form-control-user"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        required
                      />
                    </div>
                    {error ? <Alert tone="danger" text={error} compact /> : null}
                    <button type="submit" className="btn btn-primary btn-user btn-block" disabled={busy}>
                      {busy ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ api }) {
  const [state, setState] = useState({ loading: true, error: "", users: [], shops: [] });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [usersResponse, shopsResponse] = await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/shops?page=1&pageSize=8"),
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
          setState({ loading: false, error: getErrorMessage(error), users: [], shops: [] });
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
      <PageHeader title="Dashboard" subtitle="Quick overview of admin state" />
      {state.error ? <Alert tone="danger" text={state.error} /> : null}

      <div className="row">
        <MetricCard color="primary" title="Users" value={state.users.length} hint={`${activeUsers} active`} icon="users" />
        <MetricCard color="success" title="Shops" value={state.shops.length} hint={`${pendingShops} pending`} icon="store" />
        <MetricCard color="warning" title="Risk Flags" value={riskFlags} hint="High risk checks" icon="exclamation-triangle" />
        <MetricCard color="info" title="Anchored" value={anchored} hint="Shops with pledges" icon="link" />
      </div>

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Recent users" loading={state.loading}>
            <Table
              columns={["Email", "Role", "Status", "Updated"]}
              rows={state.users.slice(0, 6).map((user) => [
                user.email,
                <StatusBadge key={`${user.userId}-role`} value={user.role} tone="secondary" />,
                <StatusBadge key={`${user.userId}-status`} value={user.status} tone={toneOf(user.status)} />,
                formatDateTime(user.updatedAt),
              ])}
              emptyText="No users found"
            />
          </Card>
        </div>
        <div className="col-lg-6 mb-4">
          <Card title="Shop watchlist" loading={state.loading}>
            <Table
              columns={["Shop", "Status", "Trust", "Risk"]}
              rows={state.shops.slice(0, 6).map((shop) => [
                shop.name,
                <StatusBadge key={`${shop.shopId}-status`} value={shop.status} tone={toneOf(shop.status)} />,
                `${roundNumber(shop.trustSummary?.score)} / ${shop.trustSummary?.grade || "n/a"}`,
                `${shop.trustSummary?.highRiskCheckCount || 0} alerts`,
              ])}
              emptyText="No shops found"
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function UsersPage({ api }) {
  const [filters, setFilters] = useState({ role: "", status: "" });
  const [state, setState] = useState({ loading: true, error: "", notice: "", items: [], busyKey: "" });

  async function loadUsers(nextFilters = filters) {
    setState((current) => ({ ...current, loading: true, error: "", notice: "" }));
    try {
      const query = new URLSearchParams();
      if (nextFilters.role) query.set("role", nextFilters.role);
      if (nextFilters.status) query.set("status", nextFilters.status);
      const response = await api.get(`/admin/users${query.toString() ? `?${query}` : ""}`);
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        notice: "",
        items: response.items || [],
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(error), items: [] }));
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function mutateUser(user, path, body, successMessage) {
    setState((current) => ({ ...current, busyKey: `${user.userId}:${path}`, error: "", notice: "" }));
    try {
      await api.patch(`/admin/users/${user.userId}/${path}`, body);
      await loadUsers();
      setState((current) => ({ ...current, busyKey: "", notice: successMessage }));
    } catch (error) {
      setState((current) => ({ ...current, busyKey: "", error: getErrorMessage(error) }));
    }
  }

  async function runKeyAction(user, mode) {
    setState((current) => ({ ...current, busyKey: `${user.userId}:${mode}`, error: "", notice: "" }));
    try {
      await api.post(`/admin/users/${user.userId}/keys/${mode}`, { expectedVersion: user.version });
      await loadUsers();
      setState((current) => ({ ...current, busyKey: "", notice: `Key ${mode} completed` }));
    } catch (error) {
      setState((current) => ({ ...current, busyKey: "", error: getErrorMessage(error) }));
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Role, status and key management" />
      {state.notice ? <Alert tone="success" text={state.notice} /> : null}
      {state.error ? <Alert tone="danger" text={state.error} /> : null}

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Filters">
            <div className="form-row align-items-end">
              <div className="col-md-3 mb-3">
                <SelectField label="Role" value={filters.role} options={["", ...userRoles]} onChange={(value) => setFilters((current) => ({ ...current, role: value }))} />
              </div>
              <div className="col-md-3 mb-3">
                <SelectField label="Status" value={filters.status} options={["", ...userStatuses]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
              </div>
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-primary btn-block" onClick={() => loadUsers(filters)}>
                  Apply
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Users" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((user) => (
                    <tr key={user.userId}>
                      <td>
                        <div className="font-weight-bold text-gray-900">{user.displayName || user.email}</div>
                        <div className="small text-muted">{user.email}</div>
                      </td>
                      <td>
                        <InlineSelectAction
                          value={user.role}
                          options={userRoles}
                          buttonLabel="Update role"
                          busy={state.busyKey === `${user.userId}:role`}
                          onSubmit={(value) => mutateUser(user, "role", { expectedVersion: user.version, role: value }, "Role updated")}
                        />
                      </td>
                      <td>
                        <InlineSelectAction
                          value={user.status}
                          options={userStatuses}
                          buttonLabel="Update status"
                          busy={state.busyKey === `${user.userId}:status`}
                          onSubmit={(value) => mutateUser(user, "status", { expectedVersion: user.version, status: value }, "Status updated")}
                        />
                      </td>
                      <td>v{user.version}</td>
                      <td>
                        <div className="btn-group-vertical btn-block">
                          <button type="button" className="btn btn-outline-primary btn-sm mb-2" onClick={() => runKeyAction(user, "rotate")}>
                            Rotate key
                          </button>
                          <button type="button" className="btn btn-outline-secondary btn-sm mb-2" onClick={() => runKeyAction(user, "recover")}>
                            Recover key
                          </button>
                          <button type="button" className="btn btn-outline-info btn-sm" onClick={() => runKeyAction(user, "backfill")}>
                            Backfill key
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!state.loading && !state.items.length ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        No users matched the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ShopsPage({ api }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: "", status: "", page: 1 });
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, page: 1, hasNext: false });

  async function loadShops(nextFilters = filters) {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const query = new URLSearchParams({ page: String(nextFilters.page || 1), pageSize: "12" });
      if (nextFilters.q) query.set("q", nextFilters.q);
      if (nextFilters.status) query.set("status", nextFilters.status);
      const response = await api.get(`/admin/shops?${query}`);
      setState({
        loading: false,
        error: "",
        items: response.items || [],
        total: response.total || 0,
        page: response.page || 1,
        hasNext: Boolean(response.hasNext),
      });
    } catch (error) {
      setState({ loading: false, error: getErrorMessage(error), items: [], total: 0, page: 1, hasNext: false });
    }
  }

  useEffect(() => {
    loadShops();
  }, []);

  return (
    <>
      <PageHeader title="Shops" subtitle="Search and moderate shops" />
      {state.error ? <Alert tone="danger" text={state.error} /> : null}

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Filters">
            <div className="form-row align-items-end">
              <div className="col-md-5 mb-3">
                <label>Search</label>
                <input className="form-control" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="shop name or address" />
              </div>
              <div className="col-md-3 mb-3">
                <SelectField label="Status" value={filters.status} options={["", ...shopStatuses]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
              </div>
              <div className="col-md-2 mb-3">
                <button type="button" className="btn btn-primary btn-block" onClick={() => loadShops({ ...filters, page: 1 })}>
                  Apply
                </button>
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
                        <StatusBadge value={shop.status} tone={toneOf(shop.status)} />
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

            {!state.loading && !state.items.length ? <div className="text-center text-muted py-4">No shops matched the current filters.</div> : null}

            <div className="d-flex justify-content-between mt-3">
              <button type="button" className="btn btn-outline-secondary" disabled={state.page <= 1} onClick={() => {
                const next = { ...filters, page: state.page - 1 };
                setFilters(next);
                loadShops(next);
              }}>
                Previous
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={!state.hasNext} onClick={() => {
                const next = { ...filters, page: state.page + 1 };
                setFilters(next);
                loadShops(next);
              }}>
                Next
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ShopDetailPage({ api }) {
  const { shopId = "" } = useParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    shop: null,
    products: [],
    pledges: [],
    pledgeProof: null,
    reportsByProduct: {},
    saving: "",
  });

  async function loadShopDetail() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [shop, productsResponse, pledgesResponse] = await Promise.all([
        api.get(`/shops/${shopId}`),
        api.get(`/shops/${shopId}/products`),
        api.get(`/shops/${shopId}/pledges`),
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
        pledgeProof: null,
        reportsByProduct: Object.fromEntries(reportEntries),
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }

  useEffect(() => {
    loadShopDetail();
  }, [shopId]);

  async function moderateShop(status, moderationNote) {
    setState((current) => ({ ...current, saving: "shop", error: "" }));
    try {
      const shop = await api.patch(`/admin/shops/${shopId}/moderation`, {
        expectedVersion: state.shop.version,
        status,
        moderationNote,
      });
      setState((current) => ({ ...current, saving: "", shop }));
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: getErrorMessage(error) }));
    }
  }

  async function moderateProduct(product, status, moderationNote) {
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
        products: current.products.map((item) => item.productId === updated.productId ? updated : item),
      }));
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: getErrorMessage(error) }));
    }
  }

  async function moderateReport(report, status, moderationNote) {
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
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: getErrorMessage(error) }));
    }
  }

  async function viewProof(pledgeId) {
    setState((current) => ({ ...current, saving: `proof:${pledgeId}`, error: "" }));
    try {
      const pledgeProof = await api.get(`/shops/${shopId}/pledges/${pledgeId}/proof`);
      setState((current) => ({ ...current, saving: "", pledgeProof }));
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: getErrorMessage(error) }));
    }
  }

  async function runIntegrityAction(pledge, mode) {
    setState((current) => ({ ...current, saving: `${mode}:${pledge.pledgeId}`, error: "" }));
    try {
      const endpoint = mode === "reanchor"
        ? `/admin/shops/${shopId}/pledges/${pledge.pledgeId}/reanchor`
        : `/admin/shops/${shopId}/pledges/${pledge.pledgeId}/revoke`;
      const updated = await api.post(endpoint, { expectedVersion: pledge.version });
      setState((current) => ({
        ...current,
        saving: "",
        pledges: current.pledges.map((item) => item.pledgeId === updated.pledgeId ? updated : item),
      }));
    } catch (error) {
      setState((current) => ({ ...current, saving: "", error: getErrorMessage(error) }));
    }
  }

  return (
    <>
      <PageHeader title={state.shop?.name || shopId} subtitle="Shop moderation, products and proof" />
      {state.error ? <Alert tone="danger" text={state.error} /> : null}

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Shop moderation" loading={state.loading}>
            {state.shop ? (
              <ActionForm
                currentValue={state.shop.status}
                options={shopStatuses}
                buttonLabel={state.saving === "shop" ? "Saving..." : "Apply moderation"}
                disabled={state.saving === "shop"}
                summary={[
                  ["Owner", state.shop.ownerUserId],
                  ["Trust", `${roundNumber(state.shop.trustSummary?.score)} / ${state.shop.trustSummary?.grade || "n/a"}`],
                  ["Current status", state.shop.status],
                ]}
                onSubmit={({ value, note }) => moderateShop(value, note)}
              />
            ) : null}
          </Card>
        </div>

        <div className="col-12 mb-4">
          <Card title="Products" loading={state.loading}>
            <div className="accordion-react">
              {state.products.map((product) => (
                <div className="card shadow-sm mb-3" key={product.productId}>
                  <div className="card-header py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="m-0 font-weight-bold text-primary">{product.name}</h6>
                      <div className="small text-muted">{product.category || "No category"}</div>
                    </div>
                    <StatusBadge value={product.status} tone={toneOf(product.status)} />
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
                          <StatusBadge value={report.status} tone={toneOf(report.status)} />
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
                          ]}
                          onSubmit={({ value, note }) => moderateReport(report, value, note)}
                        />
                      </div>
                    ))}
                    {!(state.reportsByProduct[product.productId] || []).length ? (
                      <div className="small text-muted">No freshness reports for this product.</div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!state.loading && !state.products.length ? <div className="text-muted">This shop has no products.</div> : null}
            </div>
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
                        <StatusBadge value={pledge.integrityStatus} tone={toneOf(pledge.integrityStatus)} />
                      </div>
                      <div className="small mb-1">Category: {pledge.category}</div>
                      <div className="small mb-1">Score: {roundNumber(pledge.score)}</div>
                      <div className="small mb-1">Anchor: {pledge.chainAnchorStatus || "n/a"}</div>
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
            {!state.loading && !state.pledges.length ? <div className="text-muted">No pledge history for this shop.</div> : null}

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

function ToolsPage({ api }) {
  const [buyerForm, setBuyerForm] = useState({ checkId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [reportForm, setReportForm] = useState({ reportId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function submitBuyerCheck(event) {
    event.preventDefault();
    setBusy("buyer");
    setMessage("");
    try {
      const result = await api.patch(`/admin/buyer-checks/${buyerForm.checkId}/moderation`, {
        expectedVersion: Number(buyerForm.expectedVersion),
        status: buyerForm.status,
        moderationNote: buyerForm.moderationNote,
      });
      setMessage(`Buyer check ${result.checkId} updated to ${result.status}`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    setBusy("report");
    setMessage("");
    try {
      const result = await api.patch(`/admin/product-freshness-reports/${reportForm.reportId}/moderation`, {
        expectedVersion: Number(reportForm.expectedVersion),
        status: reportForm.status,
        moderationNote: reportForm.moderationNote,
      });
      setMessage(`Freshness report ${result.reportId} updated to ${result.status}`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader title="Integrity Tools" subtitle="Direct moderation by explicit ID and version" />
      <Alert tone="info" text="API hiện chưa có list buyer checks toàn cục. Màn này xử lý trực tiếp theo ID và expectedVersion." />
      {message ? <Alert tone={message.includes("updated") ? "success" : "danger"} text={message} /> : null}

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Buyer check moderation">
            <form onSubmit={submitBuyerCheck}>
              <div className="form-group">
                <label>Check ID</label>
                <input className="form-control" value={buyerForm.checkId} onChange={(event) => setBuyerForm({ ...buyerForm, checkId: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Expected version</label>
                <input className="form-control" type="number" min="1" value={buyerForm.expectedVersion} onChange={(event) => setBuyerForm({ ...buyerForm, expectedVersion: event.target.value })} required />
              </div>
              <div className="form-group">
                <SelectField label="Status" value={buyerForm.status} options={buyerCheckStatuses} onChange={(value) => setBuyerForm({ ...buyerForm, status: value })} />
              </div>
              <div className="form-group">
                <label>Moderation note</label>
                <textarea className="form-control" rows="4" value={buyerForm.moderationNote} onChange={(event) => setBuyerForm({ ...buyerForm, moderationNote: event.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy === "buyer"}>
                {busy === "buyer" ? "Applying..." : "Moderate buyer check"}
              </button>
            </form>
          </Card>
        </div>

        <div className="col-lg-6 mb-4">
          <Card title="Freshness report moderation">
            <form onSubmit={submitReport}>
              <div className="form-group">
                <label>Report ID</label>
                <input className="form-control" value={reportForm.reportId} onChange={(event) => setReportForm({ ...reportForm, reportId: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Expected version</label>
                <input className="form-control" type="number" min="1" value={reportForm.expectedVersion} onChange={(event) => setReportForm({ ...reportForm, expectedVersion: event.target.value })} required />
              </div>
              <div className="form-group">
                <SelectField label="Status" value={reportForm.status} options={reportStatuses} onChange={(value) => setReportForm({ ...reportForm, status: value })} />
              </div>
              <div className="form-group">
                <label>Moderation note</label>
                <textarea className="form-control" rows="4" value={reportForm.moderationNote} onChange={(event) => setReportForm({ ...reportForm, moderationNote: event.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy === "report"}>
                {busy === "report" ? "Applying..." : "Moderate freshness report"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="d-sm-flex align-items-center justify-content-between mb-4">
      <div>
        <h1 className="h3 mb-0 text-gray-800">{title}</h1>
        <div className="small text-muted mt-1">{subtitle}</div>
      </div>
    </div>
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

function Card({ title, loading = false, children }) {
  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
        <h6 className="m-0 font-weight-bold text-primary">{title}</h6>
        {loading ? <span className="badge badge-light">Loading</span> : null}
      </div>
      <div className="card-body">{children}</div>
    </div>
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
          <div className="col-md-4 mb-2" key={label}>
            <div className="small text-muted">{label}</div>
            <div className="font-weight-bold text-gray-800">{content}</div>
          </div>
        ))}
      </div>
      <div className="form-row align-items-end">
        <div className="col-md-3 mb-3">
          <SelectField label="Status" value={value} options={options} onChange={setValue} />
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

function InlineSelectAction({ value, options, buttonLabel, busy, onSubmit }) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  return (
    <div className="inline-action-react">
      <select className="form-control form-control-sm mb-2" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <button type="button" className="btn btn-sm btn-outline-primary btn-block" disabled={busy} onClick={() => onSubmit(selected)}>
        {busy ? "Saving..." : buttonLabel}
      </button>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <>
      <label>{label}</label>
      <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || "__empty"} value={option}>
            {option || "All"}
          </option>
        ))}
      </select>
    </>
  );
}

function StatusBadge({ value, tone }) {
  return <span className={`badge badge-${tone}`}>{value}</span>;
}

function Alert({ tone, text, compact = false }) {
  const klass = tone === "danger"
    ? "alert-danger"
    : tone === "success"
      ? "alert-success"
      : tone === "info"
        ? "alert-info"
        : "alert-secondary";
  return <div className={`alert ${klass} ${compact ? "py-2" : ""}`}>{text}</div>;
}

function Table({ columns, rows, emptyText }) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={`row-${index}`}>
              {row.map((cell, cellIndex) => <td key={`cell-${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return emptySession();
    return { ...emptySession(), ...JSON.parse(raw) };
  } catch {
    return emptySession();
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function emptySession() {
  return { apiBaseUrl: DEFAULT_API_BASE, accessToken: "", refreshToken: "", userId: "", email: "" };
}

function createApiClient(session, onSessionChange) {
  return {
    get: (path) => apiFetch(session, onSessionChange, path, { method: "GET" }),
    post: (path, body) => apiFetch(session, onSessionChange, path, { method: "POST", body }),
    patch: (path, body) => apiFetch(session, onSessionChange, path, { method: "PATCH", body }),
  };
}

async function apiFetch(session, onSessionChange, path, options) {
  const url = `${session.apiBaseUrl}${path}`;
  try {
    return await request(url, {
      ...options,
      headers: session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });
  } catch (error) {
    if (error.status === 401 && session.refreshToken) {
      const refreshed = await request(`${session.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        body: { refreshToken: session.refreshToken },
      });
      const nextSession = {
        ...session,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || session.refreshToken,
        userId: refreshed.userId || session.userId,
        email: refreshed.email || session.email,
      };
      onSessionChange(nextSession);
      return request(url, {
        ...options,
        headers: { Authorization: `Bearer ${nextSession.accessToken}` },
      });
    }
    throw error;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? safeJsonParse(text) : {};
  if (!response.ok) {
    const error = new Error(payload?.error || response.statusText || "Request failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function toneOf(value) {
  if (["active", "completed", "verified"].includes(value)) return "success";
  if (["pending", "draft"].includes(value)) return "warning";
  if (["flagged", "rejected", "revoked", "suspended", "disabled"].includes(value)) return "danger";
  return "secondary";
}

function roundNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value.toFixed(2) : "0.00";
}

function formatDateTime(value) {
  if (!value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "n/a" : date.toLocaleString();
}

function shortText(value) {
  if (!value) return "n/a";
  return value.length <= 18 ? value : `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default App;
