import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";

export default function VerifyEventPage() {
  const api = useApi();
  const { eventId = "" } = useParams();
  const [state, setState] = useState({ loading: true, error: "", result: null });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api.get(`/events/${eventId}/verify`);
        if (active) {
          setState({ loading: false, error: "", result });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, result: null });
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [api, eventId]);

  return (
    <>
      <PageHeader title={`Xác minh sự kiện ${eventId}`} subtitle="Chi tiết xác thực cho một sự kiện audit" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12">
          <Card title="Kết quả xác minh" loading={state.loading}>
            {state.result ? (
              <div className="row">
                <Metric label="Loại tài nguyên" value={state.result.resourceType} />
                <Metric label="Mã tài nguyên" value={state.result.resourceId} />
                <Metric label="Sequence" value={state.result.sequence} />
                <Metric label="Sự kiện trước" value={state.result.previousEventId || "Không có"} />
                <Metric label="Hash nội dung" value={<StatusBadge value={String(state.result.contentHashValid)} tone={state.result.contentHashValid ? "success" : "danger"} />} />
                <Metric label="Chữ ký" value={<StatusBadge value={String(state.result.signatureValid)} tone={state.result.signatureValid ? "success" : "danger"} />} />
                <Metric label="Liên kết chuỗi" value={<StatusBadge value={String(state.result.chainLinkValid)} tone={state.result.chainLinkValid ? "success" : "danger"} />} />
                <Metric label="Có sự kiện trước" value={<StatusBadge value={String(state.result.previousEventPresent)} tone={state.result.previousEventPresent ? "success" : "danger"} />} />
                <Metric label="Đã xác minh" value={<StatusBadge value={String(state.result.verified)} tone={state.result.verified ? "success" : "danger"} />} />
              </div>
            ) : (
              <div className="text-muted">Không có kết quả xác minh.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="col-md-4 mb-4">
      <div className="small text-muted">{label}</div>
      <div className="font-weight-bold text-gray-800">{value}</div>
    </div>
  );
}
