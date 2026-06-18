"use client";
import { useState, useCallback } from "react";
import { TEAM_ROLES, ROLE_DISPLAY_NAMES, TeamMemberType, generatePassword } from "@/lib/team-constants";

interface Props {
  onSuccess: () => void;
}

export function AddMemberForm({ onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "internal" as TeamMemberType,
    roles: [] as string[],
    password: "",
    outsource: {
      companyName: "",
      companyAddress: "",
      bankDetails: {
        bankName: "",
        accountNo: "",
        ifscCode: "",
      },
    },
  });

  const [autoPass, setAutoPass] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleRole = (r: string) => {
    setForm((f) => {
      if (f.roles.includes(r)) return { ...f, roles: f.roles.filter((x) => x !== r) };
      if (f.roles.length >= 3) return f;
      return { ...f, roles: [...f.roles, r] };
    });
  };

  const handleGenerate = useCallback(() => {
    setForm((f) => ({ ...f, password: generatePassword() }));
    setAutoPass(false);
    setShowPass(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (form.roles.length === 0) {
      setError("Select at least one role.");
      return;
    }

    const pwd = autoPass ? generatePassword() : form.password;
    if (!autoPass && pwd.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        type: form.type,
        roles: form.roles,
        password: pwd,
        outsource: form.type === "outsource" ? form.outsource : undefined,
      };

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create member.");
        return;
      }
      setCreated({ name: data.name, email: data.email, password: data.password });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Member Onboarded!</h3>
        <p className="text-[11px] text-gray-400 mb-5">
          Share these credentials with <span className="font-semibold text-gray-700">{created.name}</span>.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-bold">Email</p>
              <p className="text-[12px] font-semibold text-gray-800">{created.email}</p>
            </div>
            <button
              onClick={() => copy(created.email)}
              type="button"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Copy email"
            >
              <CopyIcon />
            </button>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-bold">Password</p>
              <p className="text-[12px] font-mono font-bold text-indigo-600">{created.password}</p>
            </div>
            <button
              onClick={() => copy(created.password)}
              type="button"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Copy password"
            >
              {copied ? <span className="text-[10px] text-emerald-500 font-bold">✓</span> : <CopyIcon />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setCreated(null);
              setForm({
                name: "",
                email: "",
                phone: "",
                type: "internal",
                roles: [],
                password: "",
                outsource: {
                  companyName: "",
                  companyAddress: "",
                  bankDetails: { bankName: "", accountNo: "", ifscCode: "" },
                },
              });
              setAutoPass(true);
            }}
            type="button"
            className="flex-1 py-2 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            Add Another
          </button>
          <button
            onClick={onSuccess}
            type="button"
            className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow hover:opacity-90 transition-all"
          >
            View Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl space-y-5">
      {error && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg text-[11px] text-rose-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            placeholder="Sarah Jenkins"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            placeholder="sarah@agency.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone (Optional)</label>
          <input
            type="text"
            placeholder="+1 555-0199"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Member Type</label>
          <div className="flex gap-2">
            {(["internal", "outsource"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-lg border text-[11px] font-bold transition-all capitalize ${
                  form.type === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Outsource Conditional fields */}
      {form.type === "outsource" && (
        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-4 animate-in fade-in duration-200">
          <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Outsource Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Company Name</label>
              <input
                type="text"
                placeholder="Freelance Corp"
                value={form.outsource.companyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, outsource: { ...f.outsource, companyName: e.target.value } }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Company Address</label>
              <input
                type="text"
                placeholder="123 Creative Street"
                value={form.outsource.companyAddress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, outsource: { ...f.outsource, companyAddress: e.target.value } }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="h-px bg-gray-200/60" />
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bank Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Bank Name</label>
              <input
                type="text"
                placeholder="Chase Bank"
                value={form.outsource.bankDetails.bankName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    outsource: {
                      ...f.outsource,
                      bankDetails: { ...f.outsource.bankDetails, bankName: e.target.value },
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Account Number</label>
              <input
                type="text"
                placeholder="1234567890"
                value={form.outsource.bankDetails.accountNo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    outsource: {
                      ...f.outsource,
                      bankDetails: { ...f.outsource.bankDetails, accountNo: e.target.value },
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">IFSC Code / Bank Code</label>
              <input
                type="text"
                placeholder="CHAS0123456"
                value={form.outsource.bankDetails.ifscCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    outsource: {
                      ...f.outsource,
                      bankDetails: { ...f.outsource.bankDetails, ifscCode: e.target.value },
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Roles */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Roles <span className="text-gray-300 font-normal">(select 1–3)</span>
        </label>
        {form.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.roles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold"
              >
                {ROLE_DISPLAY_NAMES[r as never] || r}
                <button
                  type="button"
                  onClick={() => toggleRole(r)}
                  className="hover:text-rose-500 font-bold transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEAM_ROLES.map((r) => {
            const sel = form.roles.includes(r);
            const dis = !sel && form.roles.length >= 3;
            return (
              <button
                key={r}
                type="button"
                onClick={() => !dis && toggleRole(r)}
                className={`px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all text-left truncate ${
                  sel
                    ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                    : dis
                    ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/40"
                }`}
              >
                {ROLE_DISPLAY_NAMES[r] || r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div
              className={`w-8 h-4 rounded-full transition-colors relative ${autoPass ? "bg-indigo-500" : "bg-gray-200"}`}
              onClick={() => {
                setAutoPass((a) => !a);
                if (!autoPass) setForm((f) => ({ ...f, password: "" }));
              }}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                  autoPass ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-[10px] text-gray-400">Auto-generate</span>
          </label>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showPass ? "text" : "password"}
              placeholder={autoPass ? "Will be auto-generated" : "Min. 8 characters"}
              value={form.password}
              disabled={autoPass}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:text-gray-300 transition-all"
            />
            {!autoPass && (
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="text-[11px]">{showPass ? "🙈" : "👁️"}</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            title="Auto-generate password"
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all text-[11px] font-bold shrink-0"
          >
            🔄 Generate
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-8 py-2.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 shadow-md shadow-indigo-500/20 disabled:opacity-60 transition-all"
        >
          {loading ? "Creating…" : "Create Member & Send Credentials"}
        </button>
      </div>
    </form>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
