import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { buyerCheckStatuses, labelOf, reportStatuses } from "../lib/constants.js";

export default function ToolsPage() {
  const api = useApi();
  const toast = useToast();
  const { me } = useOutletContext() || {};
  const isAdmin = String(me?.role || "").toLowerCase() === "admin";
  const [searchParams] = useSearchParams();
  const [buyerForm, setBuyerForm] = useState({ checkId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [reportForm, setReportForm] = useState({ reportId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const checkId = searchParams.get("buyerCheckId");
    const expectedVersion = searchParams.get("expectedVersion");
    const status = searchParams.get("status");
    const reportId = searchParams.get("reportId");
    const reportExpectedVersion = searchParams.get("reportExpectedVersion");
    if (!checkId && !expectedVersion && !status && !reportId && !reportExpectedVersion) {
      return;
    }

    setBuyerForm((current) => ({
      ...current,
      checkId: checkId || current.checkId,
      expectedVersion: expectedVersion || current.expectedVersion,
      status: status && buyerCheckStatuses.includes(status) ? status : current.status,
    }));
    setReportForm((current) => ({
      ...current,
      reportId: reportId || current.reportId,
      expectedVersion: reportExpectedVersion || current.expectedVersion,
    }));
  }, [searchParams]);

  async function submitBuyerCheck(event) {
    event.preventDefault();
    setBusy("buyer");
    setError("");
    try {
      const result = await patchBuyerCheckWithRetry(api, buyerForm);
      toast.success(`Đã cập nhật lượt kiểm tra ${result.checkId} sang ${labelOf(result.status)}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy("");
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    setBusy("report");
    setError("");
    try {
      const result = await patchReportWithRetry(api, reportForm);
      toast.success(`Đã cập nhật báo cáo ${result.reportId} sang ${labelOf(result.status)}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader title="Công cụ xử lý nhanh" subtitle="Xử lý trực tiếp khi đã có mã và phiên bản của dữ liệu" />
      <AlertBanner
        tone="info"
        text={
          <>
            Đã có danh sách chung cho các lượt kiểm tra của khách tại{" "}
            <Link to="/buyer-checks">màn Lượt kiểm tra khách</Link>. Bạn có thể bấm “Duyệt nhanh” để điền sẵn mã và phiên bản tại đây.
          </>
        }
      />
      {!isAdmin ? <AlertBanner tone="info" text="Tài khoản hiện tại chỉ có quyền xem, không có quyền duyệt." /> : null}
      <AlertBanner tone="danger" text={error} />

      <div className="row">
        <div className="col-lg-6 mb-4">
          <Card title="Duyệt kết quả kiểm tra của khách">
            <form onSubmit={submitBuyerCheck}>
              <div className="form-group">
                <label>Mã lượt kiểm tra</label>
                <input className="form-control" value={buyerForm.checkId} onChange={(event) => setBuyerForm({ ...buyerForm, checkId: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phiên bản mong muốn</label>
                <input className="form-control" type="number" min="1" value={buyerForm.expectedVersion} onChange={(event) => setBuyerForm({ ...buyerForm, expectedVersion: event.target.value })} required />
              </div>
              <div className="form-group">
                <SelectField label="Trạng thái" value={buyerForm.status} options={buyerCheckStatuses} onChange={(value) => setBuyerForm({ ...buyerForm, status: value })} />
              </div>
              <div className="form-group">
                <label>Ghi chú xử lý</label>
                <textarea className="form-control" rows="4" value={buyerForm.moderationNote} onChange={(event) => setBuyerForm({ ...buyerForm, moderationNote: event.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!isAdmin || busy === "buyer"}>
                {busy === "buyer" ? "Đang áp dụng..." : "Lưu kết quả xử lý"}
              </button>
            </form>
          </Card>
        </div>

        <div className="col-lg-6 mb-4">
          <Card title="Duyệt báo cáo độ tươi">
            <form onSubmit={submitReport}>
              <div className="form-group">
                <label>Mã báo cáo</label>
                <input className="form-control" value={reportForm.reportId} onChange={(event) => setReportForm({ ...reportForm, reportId: event.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phiên bản mong muốn</label>
                <input className="form-control" type="number" min="1" value={reportForm.expectedVersion} onChange={(event) => setReportForm({ ...reportForm, expectedVersion: event.target.value })} required />
              </div>
              <div className="form-group">
                <SelectField label="Trạng thái" value={reportForm.status} options={reportStatuses} onChange={(value) => setReportForm({ ...reportForm, status: value })} />
              </div>
              <div className="form-group">
                <label>Ghi chú xử lý</label>
                <textarea className="form-control" rows="4" value={reportForm.moderationNote} onChange={(event) => setReportForm({ ...reportForm, moderationNote: event.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!isAdmin || busy === "report"}>
                {busy === "report" ? "Đang áp dụng..." : "Lưu kết quả xử lý"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

async function patchBuyerCheckWithRetry(api, buyerForm) {
  try {
    return await api.patch(`/admin/buyer-checks/${buyerForm.checkId}/moderation`, {
      expectedVersion: Number(buyerForm.expectedVersion),
      status: buyerForm.status,
      moderationNote: buyerForm.moderationNote,
    });
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("version conflict")) {
      throw error;
    }
    const latestVersion = await getLatestResourceVersion(api, "buyer_check", buyerForm.checkId);
    return api.patch(`/admin/buyer-checks/${buyerForm.checkId}/moderation`, {
      expectedVersion: Number(latestVersion || buyerForm.expectedVersion || 1),
      status: buyerForm.status,
      moderationNote: buyerForm.moderationNote,
    });
  }
}

async function patchReportWithRetry(api, reportForm) {
  try {
    return await api.patch(`/admin/product-freshness-reports/${reportForm.reportId}/moderation`, {
      expectedVersion: Number(reportForm.expectedVersion),
      status: reportForm.status,
      moderationNote: reportForm.moderationNote,
    });
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("version conflict")) {
      throw error;
    }
    const latestVersion = await getLatestResourceVersion(api, "product_freshness_report", reportForm.reportId);
    return api.patch(`/admin/product-freshness-reports/${reportForm.reportId}/moderation`, {
      expectedVersion: Number(latestVersion || reportForm.expectedVersion || 1),
      status: reportForm.status,
      moderationNote: reportForm.moderationNote,
    });
  }
}

async function getLatestResourceVersion(api, resourceType, resourceId) {
  if (resourceType === "buyer_check") {
    const response = await api.get("/admin/buyer-checks", { checkId: resourceId, page: 1, pageSize: 1 });
    return Number(response.items?.[0]?.version || 1);
  }
  if (resourceType === "product_freshness_report") {
    const response = await api.get("/admin/product-freshness-reports", { reportId: resourceId, page: 1, pageSize: 1 });
    return Number(response.items?.[0]?.version || 1);
  }
  return 1;
}

function SelectField({ label, value, options, onChange }) {
  return (
    <>
      <label>{label}</label>
      <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{labelOf(option)}</option>
        ))}
      </select>
    </>
  );
}
