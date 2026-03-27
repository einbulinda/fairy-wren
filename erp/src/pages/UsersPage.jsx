import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  UserCheck,
  UserX,
  X,
  Users,
  Shield,
} from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useToggleUserStatus } from "@/hooks/useUsers";
import { useSystemRoles } from "@/hooks/useSystemRoles";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import PaginatedTable from "@/components/shared/PaginatedTable";
import { fmtDate } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const ROLE_STYLES = {
  owner: "bg-purple-500/20 text-purple-400",
  manager: "bg-blue-500/20 text-blue-400",
  bartender: "bg-yellow-500/20 text-yellow-400",
  waitress: "bg-green-500/20 text-green-400",
};

const EMPTY_FORM = { name: "", role: "", pin: "", confirmPin: "" };

const RoleBadge = ({ role }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_STYLES[role] ?? "bg-surface-700 text-surface-400"}`}
  >
    {role}
  </span>
);

const UsersPage = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pinError, setPinError] = useState("");

  const { data: users = [], isLoading } = useUsers();
  const { data: systemRoles = [] } = useSystemRoles();

  const ROLES = useMemo(
    () =>
      systemRoles
        .filter((r) => r.active)
        .map((r) => ({ value: r.code, label: r.label })),
    [systemRoles],
  );
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const toggleMutation = useToggleUserStatus();

  const filtered = useMemo(() => {
    let list = users;
    if (!showInactive) list = list.filter((u) => u.active);
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q));
    }
    return list;
  }, [users, showInactive, roleFilter, search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, role: ROLES[0]?.value || "" });
    setPinError("");
    setPanelOpen(true);
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setForm({ name: user.name, role: user.role, pin: "", confirmPin: "" });
    setPinError("");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditTarget(null);
  };

  const handleField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "pin" || field === "confirmPin") setPinError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPinError("");

    const isCreate = !editTarget;

    if (isCreate && !form.pin) {
      setPinError("PIN is required");
      return;
    }
    if (form.pin) {
      if (form.pin.length < 4) {
        setPinError("PIN must be at least 4 digits");
        return;
      }
      if (form.pin !== form.confirmPin) {
        setPinError("PINs do not match");
        return;
      }
    }

    const payload = { name: form.name.trim(), role: form.role };
    if (form.pin) payload.pin = form.pin;

    if (isCreate) {
      createMutation.mutate(payload, { onSuccess: closePanel });
    } else {
      updateMutation.mutate(
        { id: editTarget.id, ...payload },
        { onSuccess: closePanel },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (_val, user) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-white">{user.name}</span>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (_val, user) => <RoleBadge role={user.role} />,
    },
    {
      key: "active",
      label: "Status",
      align: "center",
      sortable: true,
      sortFn: (a, b) => Number(a.active) - Number(b.active),
      render: (_val, user) =>
        user.active ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Active
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-700 text-surface-400">
            Inactive
          </span>
        ),
    },
    {
      key: "created_at",
      label: "Member Since",
      sortable: true,
      cellClassName: "text-surface-400 text-xs",
      render: (_val, user) => fmtDate(user.created_at),
    },
    {
      key: "_actions",
      label: "Actions",
      align: "right",
      render: (_val, user) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(user); }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
            title="Edit user"
          >
            <Edit2 size={14} />
          </button>
          {user.role !== "owner" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMutation.mutate({ id: user.id, active: !user.active });
              }}
              disabled={toggleMutation.isPending}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                user.active
                  ? "text-surface-400 hover:text-red-400 hover:bg-red-500/10"
                  : "text-surface-400 hover:text-green-400 hover:bg-green-500/10"
              }`}
              title={user.active ? "Deactivate user" : "Activate user"}
            >
              {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setRoleFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === null
                ? "bg-primary-600 text-white"
                : "bg-surface-800 border border-surface-700 text-surface-400 hover:text-white"
            }`}
          >
            All
          </button>
          {ROLES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRoleFilter(roleFilter === value ? null : value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === value
                  ? "bg-primary-600 text-white"
                  : "bg-surface-800 border border-surface-700 text-surface-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Show inactive toggle */}
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showInactive
              ? "bg-surface-600 border-surface-500 text-white"
              : "bg-surface-800 border-surface-700 text-surface-400 hover:text-white"
          }`}
        >
          {showInactive ? "Hiding inactive" : "Show inactive"}
        </button>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-surface-400">Loading…</div>
          ) : (
            <PaginatedTable
              columns={columns}
              data={filtered}
              rowKey="id"
              defaultSort={{ key: "name", dir: "asc" }}
              defaultPageSize={10}
              emptyMessage="No users found."
            />
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-surface-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-surface-400">No users found.</div>
          ) : (
            <div className="p-3 space-y-3">
              {filtered.map((user) => (
                <MobileCard key={user.id} className={!user.active ? "opacity-50" : ""}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      {user.role !== "owner" && (
                        <button
                          onClick={() =>
                            toggleMutation.mutate({ id: user.id, active: !user.active })
                          }
                          disabled={toggleMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            user.active
                              ? "text-surface-400 hover:text-red-400 hover:bg-red-500/10"
                              : "text-surface-400 hover:text-green-400 hover:bg-green-500/10"
                          }`}
                        >
                          {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <RoleBadge role={user.role} />
                    {user.active ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-700 text-surface-400">Inactive</span>
                    )}
                  </div>
                  <MobileField label="Member Since">{fmtDate(user.created_at)}</MobileField>
                </MobileCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats footer */}
      {!isLoading && (
        <p className="text-xs text-surface-500 text-right">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""} shown
          {!showInactive && users.filter((u) => !u.active).length > 0 && (
            <> · {users.filter((u) => !u.active).length} inactive hidden</>
          )}
        </p>
      )}

      {/* Slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/50"
            onClick={closePanel}
          />
          <div className="w-full max-w-md bg-surface-800 border-l border-surface-700 flex flex-col shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-500/10">
                  {editTarget ? (
                    <Edit2 size={16} className="text-primary-400" />
                  ) : (
                    <Users size={16} className="text-primary-400" />
                  )}
                </div>
                <h3 className="font-semibold text-white text-sm">
                  {editTarget ? "Edit User" : "Add User"}
                </h3>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Panel body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleField("name", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Jane Mwangi"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs text-surface-400 mb-1">
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleField("role", e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">Select role…</option>
                  {ROLES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIN section */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} className="text-surface-400" />
                  <span className="text-xs text-surface-400 font-medium uppercase tracking-wide">
                    {editTarget ? "Change PIN (optional)" : "PIN"}
                  </span>
                </div>

                {editTarget && (
                  <p className="text-xs text-surface-500 mb-3">
                    Leave blank to keep the existing PIN.
                  </p>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">
                      {editTarget ? "New PIN" : "PIN"}{" "}
                      {!editTarget && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={form.pin}
                      onChange={(e) => handleField("pin", e.target.value.replace(/\D/g, ""))}
                      className={inputCls}
                      placeholder="4–6 digits"
                      maxLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  {form.pin && (
                    <div>
                      <label className="block text-xs text-surface-400 mb-1">
                        Confirm PIN <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={form.confirmPin}
                        onChange={(e) =>
                          handleField("confirmPin", e.target.value.replace(/\D/g, ""))
                        }
                        className={inputCls}
                        placeholder="Re-enter PIN"
                        maxLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  )}

                  {pinError && (
                    <p className="text-xs text-red-400">{pinError}</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closePanel}
                  className="flex-1 px-4 py-2 rounded-lg border border-surface-600 text-surface-300 hover:text-white hover:border-surface-500 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending
                    ? "Saving…"
                    : editTarget
                      ? "Save Changes"
                      : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
