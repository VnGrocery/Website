import { useEffect, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useApi } from "../lib/api.jsx";
import { useToast } from "../components/ToastStack.jsx";

export default function AccountPage() {
  const api = useApi();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const me = await api.get("/me");
        if (active) {
          setProfile(me);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [api]);

  async function handleChangePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/me/password", form);
      toast.success(response.status || "Đổi mật khẩu thành công");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Tài khoản" subtitle="Thông tin phiên đăng nhập và đổi mật khẩu" />
      <AlertBanner tone="danger" text={error} />

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Thông tin tài khoản">
            <div className="mb-3">
              <div className="small text-muted">Mã người dùng</div>
              <div className="font-weight-bold text-gray-800">{profile?.userId || "Chưa có"}</div>
            </div>
            <div>
              <div className="small text-muted">Email</div>
              <div className="font-weight-bold text-gray-800">{profile?.email || "Chưa có"}</div>
            </div>
          </Card>
        </div>

        <div className="col-lg-6 mb-4">
          <Card title="Đổi mật khẩu">
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  className="form-control"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
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
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
