import { useEffect, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { userRoles, userStatuses } from "../lib/constants.js";
import { formatDateTime } from "../lib/format.js";
import { useSearchParams } from "react-router-dom";

export default function UsersPage() {
  const api = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", items: [], busyKey: "", keyResult: null });

  const filters = {
    role: searchParams.get("role") || "",
    status: searchParams.get("status") || "",
  };

  async function loadUsers() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await api.get("/admin/users", filters);
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        items: response.items || [],
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message, items: [] }));
    }
  }

  useEffect(() => {
    loadUsers();
  }, [searchParams.toString()]);

  async function mutateUser(user, path, body, successMessage) {
    const allowed = await confirm({
      title: "Confirm user change",
      message: `${successMessage} for ${user.email}?`,
      confirmLabel: "Apply",
      confirmTone: "primary",
    });
    if (!allowed) {
      return;
    }

    setState((current) => ({ ...current, busyKey: `${user.userId}:${path}`, error: "" }));
    try {
      await api.patch(`/admin/users/${user.userId}/${path}`, body);
      await loadUsers();
      toast.success(successMessage);
      setState((current) => ({ ...current, busyKey: "" }));
    } catch (error) {
      setState((current) => ({ ...current, busyKey: "", error: error.message }));
    }
  }

  async function runKeyAction(user, mode) {
    const allowed = await confirm({
      title: "Confirm key action",
      message: `Run ${mode} key for ${user.email}?`,
      confirmLabel: mode,
      confirmTone: "warning",
    });
    if (!allowed) {
      return;
    }

    setState((current) => ({ ...current, busyKey: `${user.userId}:${mode}`, error: "" }));
    try {
      const result = await api.post(`/admin/users/${user.userId}/keys/${mode}`, { expectedVersion: user.version });
      await loadUsers();
      setState((current) => ({ ...current, busyKey: "", keyResult: result }));
      toast.success(`Key ${mode} completed`);
    } catch (error) {
      setState((current) => ({ ...current, busyKey: "", error: error.message }));
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Role, status and key management" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Filters">
            <div className="form-row align-items-end">
              <div className="col-md-3 mb-3">
                <SelectField label="Role" value={filters.role} options={["", ...userRoles]} onChange={(value) => setSearchParams(compactQuery({ ...filters, role: value }))} />
              </div>
              <div className="col-md-3 mb-3">
                <SelectField label="Status" value={filters.status} options={["", ...userStatuses]} onChange={(value) => setSearchParams(compactQuery({ ...filters, status: value }))} />
              </div>
            </div>
          </Card>
        </div>

        {state.keyResult ? (
          <div className="col-12 mb-4">
            <Card title="Last key action result">
              <div className="row">
                <Metric label="User ID" value={state.keyResult.userId} />
                <Metric label="Algorithm" value={state.keyResult.keyAlgorithm} />
                <Metric label="Vault path" value={state.keyResult.vaultKeyPath} />
                <Metric label="Version" value={state.keyResult.version} />
                <Metric label="Public key" value={<div className="text-monospace small break-all">{state.keyResult.publicKey}</div>} wide />
              </div>
            </Card>
          </div>
        ) : null}

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
                    <th>Updated</th>
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
                      <td>{formatDateTime(user.updatedAt)}</td>
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
                </tbody>
              </table>
              {!state.loading && !state.items.length ? <EmptyState text="No users matched the current filters." /> : null}
            </div>
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
          <option key={option || "__empty"} value={option}>
            {option || "All"}
          </option>
        ))}
      </select>
    </>
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

function Metric({ label, value, wide = false }) {
  return (
    <div className={`${wide ? "col-12" : "col-md-3"} mb-3`}>
      <div className="small text-muted">{label}</div>
      <div className="font-weight-bold text-gray-800">{value}</div>
    </div>
  );
}

function compactQuery(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value));
}
