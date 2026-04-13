import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import JsonViewer from "../components/JsonViewer.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { buildQuery, useApi } from "../lib/api.jsx";
import { formatDateTime, fromDatetimeLocalInput, toDatetimeLocalInput } from "../lib/format.js";

const defaultFilters = {
  resourceType: "",
  resourceId: "",
  actorUserId: "",
  action: "",
  status: "",
  minSequence: "",
  maxSequence: "",
  createdAfter: "",
  createdBefore: "",
  page: "1",
  pageSize: "20",
};

export default function EventsPage() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(readFilters(searchParams));
  const [state, setState] = useState({ loading: true, error: "", items: [], pagination: null, expandedEventId: "" });

  useEffect(() => {
    setFilters(readFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get("/events", serializeFilters(filters));
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: "",
            items: response.items || [],
            pagination: response.pagination || null,
          }));
        }
      } catch (error) {
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
            items: [],
            pagination: null,
          }));
        }
      }
    }
    setState((current) => ({ ...current, loading: true }));
    load();
    return () => {
      active = false;
    };
  }, [api, filters]);

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Audit log with verification entrypoints"
        actions={
          <Link className="btn btn-outline-primary btn-sm" to="/events/verify">
            Verify resource
          </Link>
        }
      />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Filters">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearchParams(serializeFilters(filters));
              }}
            >
              <div className="form-row">
                <FilterInput label="Resource type" value={filters.resourceType} onChange={(value) => setFilters((current) => ({ ...current, resourceType: value }))} />
                <FilterInput label="Resource ID" value={filters.resourceId} onChange={(value) => setFilters((current) => ({ ...current, resourceId: value }))} />
                <FilterInput label="Actor user ID" value={filters.actorUserId} onChange={(value) => setFilters((current) => ({ ...current, actorUserId: value }))} />
                <FilterInput label="Action" value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))} />
              </div>
              <div className="form-row">
                <FilterInput label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
                <FilterInput label="Min sequence" value={filters.minSequence} onChange={(value) => setFilters((current) => ({ ...current, minSequence: value }))} />
                <FilterInput label="Max sequence" value={filters.maxSequence} onChange={(value) => setFilters((current) => ({ ...current, maxSequence: value }))} />
                <DateFilter label="Created after" value={filters.createdAfter} onChange={(value) => setFilters((current) => ({ ...current, createdAfter: value }))} />
                <DateFilter label="Created before" value={filters.createdBefore} onChange={(value) => setFilters((current) => ({ ...current, createdBefore: value }))} />
              </div>
              <div className="mt-2">
                <button type="submit" className="btn btn-primary mr-2">Apply</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSearchParams(defaultFilters)}>
                  Reset
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="col-12">
          <Card title="Audit events" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Seq</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((event) => (
                    <Fragment key={event.eventId}>
                      <tr key={event.eventId}>
                        <td>
                          <div className="font-weight-bold text-gray-900">{event.eventId}</div>
                          <div className="small text-muted">{event.resourceType}:{event.resourceId}</div>
                        </td>
                        <td>{event.actorUserId}</td>
                        <td>{event.action}</td>
                        <td><StatusBadge value={event.status} /></td>
                        <td>{event.sequence}</td>
                        <td>{formatDateTime(event.createdAt)}</td>
                        <td>
                          <div className="btn-group btn-group-sm flex-wrap">
                            <Link className="btn btn-outline-primary" to={`/events/${event.eventId}/verify`}>
                              Verify event
                            </Link>
                            <Link
                              className="btn btn-outline-secondary"
                              to={`/events/verify?${buildQuery({ resourceType: event.resourceType, resourceId: event.resourceId })}`}
                            >
                              Verify resource
                            </Link>
                            <button
                              type="button"
                              className="btn btn-outline-info"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  expandedEventId: current.expandedEventId === event.eventId ? "" : event.eventId,
                                }))
                              }
                            >
                              Payload
                            </button>
                          </div>
                        </td>
                      </tr>
                      {state.expandedEventId === event.eventId ? (
                        <tr key={`${event.eventId}-payload`}>
                          <td colSpan="7">
                            <div className="row">
                              <div className="col-lg-6 mb-3">
                                <div className="small text-muted mb-1">Signature</div>
                                <div className="text-monospace small break-all">{event.signature}</div>
                              </div>
                              <div className="col-lg-6 mb-3">
                                <div className="small text-muted mb-1">Content SHA256</div>
                                <div className="text-monospace small break-all">{event.contentSha256}</div>
                              </div>
                            </div>
                            <JsonViewer value={event.payloadJson} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!state.loading && !state.items.length ? <EmptyState text="No events matched the current filters." /> : null}
            </div>
            <PaginationBar
              page={Number(filters.page || 1)}
              hasNext={Boolean(state.pagination && state.pagination.page < state.pagination.totalPages)}
              onPrevious={() => setSearchParams(serializeFilters({ ...filters, page: String(Math.max(Number(filters.page) - 1, 1)) }))}
              onNext={() => setSearchParams(serializeFilters({ ...filters, page: String(Number(filters.page) + 1) }))}
              summary={
                state.pagination
                  ? `Page ${state.pagination.page} / ${state.pagination.totalPages}, total ${state.pagination.totalItems} events`
                  : ""
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function readFilters(searchParams) {
  return { ...defaultFilters, ...Object.fromEntries(searchParams.entries()) };
}

function serializeFilters(filters) {
  return {
    ...filters,
    createdAfter: fromDatetimeLocalInput(filters.createdAfter),
    createdBefore: fromDatetimeLocalInput(filters.createdBefore),
  };
}

function FilterInput({ label, value, onChange }) {
  return (
    <div className="col-md-3 mb-3">
      <label>{label}</label>
      <input className="form-control" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="col-md-3 mb-3">
      <label>{label}</label>
      <input className="form-control" type="datetime-local" value={toDatetimeLocalInput(value)} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
