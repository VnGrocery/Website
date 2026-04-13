import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import { requestJson } from "../lib/api.jsx";
import { normalizeApiBase } from "../lib/session.jsx";

export default function ForgotPasswordPage({ session }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(session?.email || "");
  const [apiBaseUrl, setApiBaseUrl] = useState(session?.apiBaseUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (session?.accessToken) {
      navigate("/", { replace: true });
    }
  }, [navigate, session]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await requestJson(`${normalizeApiBase(apiBaseUrl)}/auth/password/forgot`, {
        method: "POST",
        body: { email },
      });
      setResult(response);
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
                  <h1 className="h4 text-gray-900 mb-2">Forgot Password</h1>
                  <p className="mb-4">Yêu cầu reset token từ backend.</p>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>API base URL</label>
                    <input className="form-control" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  </div>
                  <AlertBanner tone="danger" text={error} compact />
                  {result ? (
                    <AlertBanner
                      tone="success"
                      text={`Status: ${result.status}${result.resetToken ? ` | Reset token: ${result.resetToken}` : ""}`}
                      compact
                    />
                  ) : null}
                  <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                    {busy ? "Submitting..." : "Request reset"}
                  </button>
                </form>
                <hr />
                <div className="text-center">
                  <button type="button" className="btn btn-link small" onClick={() => navigate("/reset-password")}>
                    Go to reset page
                  </button>
                </div>
                <div className="text-center">
                  <button type="button" className="btn btn-link small" onClick={() => navigate("/login")}>
                    Back to login
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
