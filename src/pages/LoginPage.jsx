import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import { requestJson } from "../lib/api.jsx";
import { normalizeApiBase, useSession } from "../lib/session.jsx";

export default function LoginPage({ session }) {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [form, setForm] = useState({
    apiBaseUrl: session?.apiBaseUrl || "",
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
      const apiBaseUrl = normalizeApiBase(form.apiBaseUrl);
      const response = await requestJson(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        body: { email: form.email, password: form.password },
      });
      setSession({
        apiBaseUrl,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || "",
        userId: response.userId || "",
        email: response.email || form.email,
      });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
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
                    <AlertBanner tone="danger" text={error} compact />
                    <button type="submit" className="btn btn-primary btn-user btn-block" disabled={busy}>
                      {busy ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                  <hr />
                  <div className="text-center">
                    <button type="button" className="btn btn-link small" onClick={() => navigate("/forgot-password")}>
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
