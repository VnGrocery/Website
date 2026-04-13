import { useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { buyerCheckStatuses, reportStatuses } from "../lib/constants.js";

export default function ToolsPage() {
  const api = useApi();
  const toast = useToast();
  const [buyerForm, setBuyerForm] = useState({ checkId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [reportForm, setReportForm] = useState({ reportId: "", expectedVersion: "", status: "flagged", moderationNote: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function submitBuyerCheck(event) {
    event.preventDefault();
    setBusy("buyer");
    setError("");
    try {
      const result = await api.patch(`/admin/buyer-checks/${buyerForm.checkId}/moderation`, {
        expectedVersion: Number(buyerForm.expectedVersion),
        status: buyerForm.status,
        moderationNote: buyerForm.moderationNote,
      });
      toast.success(`Buyer check ${result.checkId} updated to ${result.status}`);
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
      const result = await api.patch(`/admin/product-freshness-reports/${reportForm.reportId}/moderation`, {
        expectedVersion: Number(reportForm.expectedVersion),
        status: reportForm.status,
        moderationNote: reportForm.moderationNote,
      });
      toast.success(`Freshness report ${result.reportId} updated to ${result.status}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader title="Integrity Tools" subtitle="Direct moderation by explicit ID and version" />
      <AlertBanner tone="info" text="API hiện chưa có list buyer checks toàn cục. Màn này xử lý trực tiếp theo ID và expectedVersion." />
      <AlertBanner tone="danger" text={error} />

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

function SelectField({ label, value, options, onChange }) {
  return (
    <>
      <label>{label}</label>
      <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </>
  );
}
