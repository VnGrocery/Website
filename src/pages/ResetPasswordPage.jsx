import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import { requestJson } from "../lib/api.jsx";
import { normalizeApiBase } from "../lib/session.jsx";

export default function ResetPasswordPage({ session }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    apiBaseUrl: session?.apiBaseUrl || "",
    resetToken: searchParams.get("token") || "",
    newPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    if (session?.accessToken) {
      navigate("/", { replace: true });
    }
  }, [navigate, session]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await requestJson(`${normalizeApiBase(form.apiBaseUrl)}/auth/password/reset`, {
        method: "POST",
        body: {
          resetToken: form.resetToken,
          newPassword: form.newPassword,
        },
      });
      setResult(response.status || "password_reset");
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
            <div className="card shadow-lg my-5">
              <div className="card-body p-5">
                <div className="text-center">
                  <h1 className="h4 text-gray-900 mb-2">Đặt lại mật khẩu</h1>
                  <p className="mb-4">Thiết lập mật khẩu mới bằng mã đặt lại.</p>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Địa chỉ API gốc</label>
                    <input
                      className="form-control"
                      value={form.apiBaseUrl}
                      onChange={(event) => setForm({ ...form, apiBaseUrl: event.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mã đặt lại</label>
                    <input
                      className="form-control"
                      value={form.resetToken}
                      onChange={(event) => setForm({ ...form, resetToken: event.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu mới</label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.newPassword}
                      onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                      required
                    />
                  </div>
                  <AlertBanner tone="danger" text={error} compact />
                  <AlertBanner tone="success" text={result ? `Trạng thái: ${result}` : ""} compact />
                  <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                    {busy ? "Đang gửi..." : "Đặt lại mật khẩu"}
                  </button>
                </form>
                <hr />
                <div className="text-center">
                  <button type="button" className="btn btn-link small" onClick={() => navigate("/login")}>
                    Quay lại đăng nhập
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
