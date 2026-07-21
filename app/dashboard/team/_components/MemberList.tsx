"use client";
import { useState, useEffect, useCallback } from "react";
import { TEAM_ROLES, ROLE_DISPLAY_NAMES, TeamMemberType, TeamMemberStatus } from "@/lib/team-constants";

// ── types ─────────────────────────────────────────────────────────────────────

interface OutsourceDetails {
  companyName?: string;
  companyAddress?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
  };
}

interface Member {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;            // auth-level role: "admin" | "member" | …
  roles: string[];
  status: TeamMemberStatus;
  type: TeamMemberType;
  outsource?: OutsourceDetails;
  avatarColor: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ── delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({ member, onConfirm, onCancel, loading }: {
  member: Member; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
          <span className="text-xl">🗑️</span>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-gray-900">Delete Member?</h3>
          <p className="text-[11px] text-gray-400 mt-1">
            This will permanently remove <span className="font-semibold text-gray-700">{member.name}</span> from the system. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-[11px] font-bold hover:bg-rose-600 disabled:opacity-60 transition-all">
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── view details modal ────────────────────────────────────────────────────────

function DetailsModal({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Member Details</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Full profile overview</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ background: member.avatarColor }}>
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{member.name}</h3>
              <p className="text-[10px] text-gray-400 capitalize">
                {member.role === "admin" ? "Admin" : `${member.type} Member`} · {member.status}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="font-semibold text-gray-800">{member.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone</span>
              <span className="font-semibold text-gray-800">{member.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member Type</span>
              <span className="font-semibold text-gray-800 capitalize">{member.role === "admin" ? "Admin" : member.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Roles</span>
              <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                {member.role === "admin" && (member.roles?.length ?? 0) === 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-700">Admin</span>
                ) : (
                  (member.roles || []).map(r => (
                    <span key={r} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600">
                      {ROLE_DISPLAY_NAMES[r as never] || r}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Created At</span>
              <span className="font-semibold text-gray-800">{new Date(member.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {member.type === "outsource" && member.outsource && (
            <div className="border border-indigo-100 bg-indigo-50/20 rounded-xl p-4 space-y-2.5 text-[11px]">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Outsource Information</h4>
              <div className="flex justify-between">
                <span className="text-gray-400">Company Name</span>
                <span className="font-semibold text-gray-800">{member.outsource.companyName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Company Address</span>
                <span className="font-semibold text-gray-800">{member.outsource.companyAddress || "—"}</span>
              </div>
              {member.outsource.bankDetails && (
                <>
                  <div className="h-px bg-indigo-100/50 my-1" />
                  <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank Information</h5>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bank Name</span>
                    <span className="font-semibold text-gray-800">{member.outsource.bankDetails.bankName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account No</span>
                    <span className="font-semibold text-gray-800">{member.outsource.bankDetails.accountNo || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IFSC / Bank Code</span>
                    <span className="font-semibold text-gray-800">{member.outsource.bankDetails.ifscCode || "—"}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2.5 rounded-lg text-[11px] font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── credentials modal ─────────────────────────────────────────────────────────

function CredentialsModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const generate = () => {
    const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    setPassword(Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join(""));
    setShowPass(true);
  };

  const save = async () => {
    if (password.length < 8) { setMsg("Min. 8 characters required."); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`/api/team/${member._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { const d = await res.json(); setMsg(d.error || "Failed."); return; }
      setMsg("✅ Password updated & credentials sent!");
    } catch { setMsg("Network error."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{member.name}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Credentials & password reset</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Email row */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Email / Username</p>
              <p className="text-[12px] font-semibold text-gray-800 mt-0.5">{member.email}</p>
            </div>
            <button onClick={() => copy(member.email)} type="button" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Copy email">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <p className="text-[9px] text-gray-400 font-bold uppercase">Reset Password</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px]">
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              <button type="button" onClick={generate} title="Auto-generate"
                className="px-3 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all text-[11px] font-bold">
                🔄
              </button>
              {password && (
                <button type="button" onClick={() => copy(password)} title="Copy"
                  className="px-3 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all text-[11px]">
                  {copied ? "✓" : "📋"}
                </button>
              )}
            </div>
          </div>

          {msg && <p className={`text-[10px] font-medium ${msg.startsWith("✅") ? "text-emerald-600" : "text-rose-500"}`}>{msg}</p>}

          <button onClick={save} disabled={saving || !password}
            className="w-full py-2.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Update & Notify User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── edit member modal ─────────────────────────────────────────────────────────

function EditModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone || "");
  const [type, setType] = useState<TeamMemberType>(member.type);
  const [roles, setRoles] = useState<string[]>(member.roles);
  const [outsource, setOutsource] = useState<OutsourceDetails>(member.outsource || {
    companyName: "",
    companyAddress: "",
    bankDetails: { bankName: "", accountNo: "", ifscCode: "" }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleRole = (r: string) => {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : prev.length < 3 ? [...prev, r] : prev);
  };

  const save = async () => {
    if (roles.length === 0) { setError("Select at least one role."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/team/${member._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || undefined,
          type,
          roles,
          outsource: type === "outsource" ? outsource : undefined
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed."); return; }
      onSaved(); onClose();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-900">Edit Member</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="text-[11px] text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Type</label>
              <div className="flex gap-2">
                {(["internal", "outsource"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold capitalize ${type === t ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-gray-200 bg-white text-gray-500"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {type === "outsource" && (
            <div className="p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl space-y-3">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Outsource Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Company Name" value={outsource.companyName || ""}
                  onChange={e => setOutsource(o => ({ ...o, companyName: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] focus:outline-none" />
                <input placeholder="Company Address" value={outsource.companyAddress || ""}
                  onChange={e => setOutsource(o => ({ ...o, companyAddress: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] focus:outline-none" />
              </div>
              <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank Details</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input placeholder="Bank Name" value={outsource.bankDetails?.bankName || ""}
                  onChange={e => setOutsource(o => ({ ...o, bankDetails: { ...o.bankDetails, bankName: e.target.value } }))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] focus:outline-none" />
                <input placeholder="Account No" value={outsource.bankDetails?.accountNo || ""}
                  onChange={e => setOutsource(o => ({ ...o, bankDetails: { ...o.bankDetails, accountNo: e.target.value } }))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] focus:outline-none" />
                <input placeholder="IFSC Code" value={outsource.bankDetails?.ifscCode || ""}
                  onChange={e => setOutsource(o => ({ ...o, bankDetails: { ...o.bankDetails, ifscCode: e.target.value } }))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] focus:outline-none" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Roles (1–3)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEAM_ROLES.map(r => {
                const sel = roles.includes(r);
                const dis = !sel && roles.length >= 3;
                return (
                  <button key={r} type="button" onClick={() => !dis && toggleRole(r)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all text-left truncate ${sel ? "border-indigo-400 bg-indigo-50 text-indigo-600" : dis ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                    {ROLE_DISPLAY_NAMES[r] || r}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main list ─────────────────────────────────────────────────────────────────

export function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "internal" | "outsource">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [credsMember, setCredsMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [detailsMember, setDetailsMember] = useState<Member | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) setMembers(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = members.filter(m => {
    const statusMatch = filter === "all" ? true : m.status === filter;
    const typeMatch = typeFilter === "all" ? true : m.type === typeFilter;
    const roleMatch = roleFilter === "all" ? true : (m.roles || []).includes(roleFilter);
    return statusMatch && typeMatch && roleMatch;
  });

  const toggleStatus = async (m: Member) => {
    setTogglingId(m._id);
    try {
      const res = await fetch(`/api/team/${m._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: m.status === "active" ? "inactive" : "active" }),
      });
      if (res.ok) setMembers(prev => prev.map(x => x._id === m._id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x));
    } finally { setTogglingId(null); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${deleteTarget._id}`, { method: "DELETE" });
      if (res.ok) { setMembers(prev => prev.filter(x => x._id !== deleteTarget._id)); setDeleteTarget(null); }
    } finally { setDeleting(false); }
  };

  const counts = {
    all: members.length,
    active: members.filter(m => m.status === "active").length,
    inactive: members.filter(m => m.status === "inactive").length
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(["all", "active", "inactive"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(["all", "internal", "outsource"] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all capitalize ${typeFilter === t ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter Selector */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-[10px] font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Roles</option>
            {TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_DISPLAY_NAMES[role]}
              </option>
            ))}
          </select>

          <button onClick={load} className="text-[10px] font-semibold text-gray-400 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2.2fr_2.2fr_2.2fr_1.2fr_110px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
          <span>Member</span>
          <span>Email & Phone</span>
          <span>Roles & Type</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[11px] text-gray-400">No members found matching your filters.</div>
        )}

        <div className="divide-y divide-gray-50">
          {filtered.map(m => {
          const isAdmin = m.role === "admin";
          return (
            <div key={m._id} className="grid grid-cols-[2.2fr_2.2fr_2.2fr_1.2fr_110px] gap-4 px-5 py-3 items-center hover:bg-gray-50/50 transition-colors">
              {/* Name + avatar */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ background: m.avatarColor }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[9px] text-gray-400">Since {new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="min-w-0">
                <p className="text-[11px] text-gray-600 truncate">{m.email}</p>
                <p className="text-[9px] text-gray-400">{m.phone || "No phone"}</p>
              </div>

              {/* Roles & Type */}
              <div className="flex flex-col gap-1 items-start">
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-100">
                    Admin
                  </span>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map(r => (
                        <span key={r} className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-50/80 text-indigo-600 border border-indigo-100/30">
                          {ROLE_DISPLAY_NAMES[r as never] || r}
                        </span>
                      ))}
                    </div>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${m.type === "outsource" ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600"}`}>
                      {m.type}
                    </span>
                  </>
                )}
              </div>

              {/* Status toggle — admins are read-only, shown as a static badge */}
              {isAdmin ? (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${m.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  {m.status}
                </span>
              ) : (
                <button onClick={() => toggleStatus(m)} disabled={togglingId === m._id} title="Toggle status"
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${m.status === "active" ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"} ${togglingId === m._id ? "opacity-50" : ""}`}>
                  <span className="w-4 h-4 rounded-full bg-white shadow transition-all duration-200" />
                </button>
              )}

              {/* Actions — admins are view-only (no edit/credentials/delete) */}
              <div className="flex items-center gap-1 shrink-0 justify-end">
                <button onClick={() => setDetailsMember(m)} title="View Details"
                  className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <EyeIcon />
                </button>
                {!isAdmin && (
                  <>
                    <button onClick={() => setEditMember(m)} title="Edit details"
                      className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <PencilIcon />
                    </button>
                    <button onClick={() => setCredsMember(m)} title="Credentials"
                      className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <KeyIcon />
                    </button>
                    <button onClick={() => setDeleteTarget(m)} title="Delete member"
                      className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Modals */}
      {deleteTarget && <DeleteModal member={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
      {credsMember && <CredentialsModal member={credsMember} onClose={() => setCredsMember(null)} />}
      {editMember && <EditModal member={editMember} onClose={() => setEditMember(null)} onSaved={load} />}
      {detailsMember && <DetailsModal member={detailsMember} onClose={() => setDetailsMember(null)} />}
    </div>
  );
}

// ── inline icons (no lucide dep) ─────────────────────────────────────────────
function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function PencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function KeyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
}
