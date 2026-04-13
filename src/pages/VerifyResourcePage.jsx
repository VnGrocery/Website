import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useApi } from "../lib/api.jsx";

export default function VerifyResourcePage() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resourceType, setResourceType] = useState(searchParams.get("resourceType") || "");
  const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");
  const [state, setState] = useState({ loading: false, error: "", result: null });

  useEffect(() => {
    if (!resourceType || !resourceId) {
      return;
    }
    let active = true;
    async function load() {
      setState({ loading: true, error: "", result: null });
      try {
        const result = await api.get("/events/verify", { resourceType, resourceId });
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
  }, [api, resourceId, resourceType]);

  return (
    <>
      <PageHeader title="Xác minh tài nguyên" subtitle="Kiểm tra toàn bộ chuỗi audit của một tài nguyên" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Tra cứu">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearchParams({ resourceType, resourceId });
              }}
            >
              <div className="form-row align-items-end">
                <div className="col-md-4 mb-3">
                  <label>Loại tài nguyên</label>
                  <input className="form-control" value={resourceType} onChange={(event) => setResourceType(event.target.value)} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label>Mã tài nguyên</label>
                  <input className="form-control" value={resourceId} onChange={(event) => setResourceId(event.target.value)} required />
                </div>
                <div className="col-md-2 mb-3">
                  <button type="submit" className="btn btn-primary btn-block">Xác minh</button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Kết quả xác minh" loading={state.loading}>
            {state.result ? (
              <>
                <div className="row mb-3">
                  <div className="col-md-3">
                    <div className="small text-muted">Loại tài nguyên</div>
                    <div className="font-weight-bold text-gray-800">{state.result.resourceType}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="small text-muted">Mã tài nguyên</div>
                    <div className="font-weight-bold text-gray-800">{state.result.resourceId}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="small text-muted">Số sự kiện</div>
                    <div className="font-weight-bold text-gray-800">{state.result.eventCount}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="small text-muted">Đã xác minh</div>
                    <div><StatusBadge value={String(state.result.verified)} tone={state.result.verified ? "success" : "danger"} /></div>
                  </div>
                </div>

                <DataTable
                  columns={["Sự kiện", "Seq", "Hash nội dung", "Chữ ký", "Chuỗi", "Xác minh", "Mở"]}
                  rows={(state.result.events || []).map((event) => [
                    event.eventId,
                    event.sequence,
                    <StatusBadge key={`${event.eventId}-content`} value={String(event.contentHashValid)} tone={event.contentHashValid ? "success" : "danger"} />,
                    <StatusBadge key={`${event.eventId}-signature`} value={String(event.signatureValid)} tone={event.signatureValid ? "success" : "danger"} />,
                    <StatusBadge key={`${event.eventId}-chain`} value={String(event.chainLinkValid)} tone={event.chainLinkValid ? "success" : "danger"} />,
                    <StatusBadge key={`${event.eventId}-verified`} value={String(event.verified)} tone={event.verified ? "success" : "danger"} />,
                    <Link key={`${event.eventId}-open`} className="btn btn-outline-primary btn-sm" to={`/events/${event.eventId}/verify`}>
                      Mở
                    </Link>,
                  ])}
                />
              </>
            ) : (
              <div className="text-muted">Nhập loại tài nguyên và mã tài nguyên để xác minh.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
