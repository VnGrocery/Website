import { useEffect, useState } from "react";
import AlertBanner from "../components/AlertBanner.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/ToastStack.jsx";
import { useApi } from "../lib/api.jsx";
import { labelOf, userRoles, userStatuses } from "../lib/constants.js";
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
      message: `Áp dụng thay đổi cho ${user.email}?`,
      confirmLabel: "Áp dụng",
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
      title: "Xác nhận thao tác khóa",
      message: `Thực hiện ${labelOf(mode)} khóa cho ${user.email}?`,
      confirmLabel: "Xác nhận",
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
      toast.success(`Đã ${labelOf(mode).toLowerCase()} khóa`);
    } catch (error) {
      setState((current) => ({ ...current, busyKey: "", error: error.message }));
    }
  }

  return (
    <>
      <PageHeader title="Người dùng" subtitle="Quản lý vai trò, trạng thái và khóa tài khoản" />
      <AlertBanner tone="danger" text={state.error} />

      <div className="row">
        <div className="col-12 mb-4">
          <Card title="Bộ lọc">
            <div className="form-row align-items-end">
              <div className="col-md-3 mb-3">
                <SelectField label="Vai trò" value={filters.role} options={["", ...userRoles]} onChange={(value) => setSearchParams(compactQuery({ ...filters, role: value }))} />
              </div>
              <div className="col-md-3 mb-3">
                <SelectField label="Trạng thái" value={filters.status} options={["", ...userStatuses]} onChange={(value) => setSearchParams(compactQuery({ ...filters, status: value }))} />
              </div>
            </div>
          </Card>
        </div>

        {state.keyResult ? (
          <div className="col-12 mb-4">
            <Card title="Kết quả thao tác khóa gần nhất">
              <div className="row">
                <Metric label="Mã người dùng" value={state.keyResult.userId} />
                <Metric label="Thuật toán" value={state.keyResult.keyAlgorithm} />
                <Metric label="Đường dẫn Vault" value={state.keyResult.vaultKeyPath} />
                <Metric label="Phiên bản" value={state.keyResult.version} />
                <Metric label="Public key" value={<div className="text-monospace small break-all">{state.keyResult.publicKey}</div>} wide />
              </div>
            </Card>
          </div>
        ) : null}

        <div className="col-12">
          <Card title="Danh sách người dùng" loading={state.loading}>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Phiên bản</th>
                    <th>Cập nhật</th>
                    <th>Thao tác</th>
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
                          buttonLabel="Cập nhật vai trò"
                          busy={state.busyKey === `${user.userId}:role`}
                          onSubmit={(value) => mutateUser(user, "role", { expectedVersion: user.version, role: value }, "Đã cập nhật vai trò")}
                        />
                      </td>
                      <td>
                        <InlineSelectAction
                          value={user.status}
                          options={userStatuses}
                          buttonLabel="Cập nhật trạng thái"
                          busy={state.busyKey === `${user.userId}:status`}
                          onSubmit={(value) => mutateUser(user, "status", { expectedVersion: user.version, status: value }, "Đã cập nhật trạng thái")}
                        />
                      </td>
                      <td>v{user.version}</td>
                      <td>{formatDateTime(user.updatedAt)}</td>
                      <td>
                        <div className="btn-group-vertical btn-block">
                          <button type="button" className="btn btn-outline-primary btn-sm mb-2" onClick={() => runKeyAction(user, "rotate")}>
                            Xoay khóa
                          </button>
                          <button type="button" className="btn btn-outline-secondary btn-sm mb-2" onClick={() => runKeyAction(user, "recover")}>
                            Khôi phục khóa
                          </button>
                          <button type="button" className="btn btn-outline-info btn-sm" onClick={() => runKeyAction(user, "backfill")}>
                            Bổ sung khóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.loading && !state.items.length ? <EmptyState text="Không có người dùng phù hợp bộ lọc hiện tại." /> : null}
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
            {labelOf(option)}
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
