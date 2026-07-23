"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, ExternalLink, Mail, Phone, Users, CheckCircle, Clock } from "lucide-react";

interface TeamMember {
  id: string;
  _id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  roles?: string[];
}

interface ClientListItem {
  id: string;
  name: string;
  brandName: string;
  industry: string;
  website: string;
  status: "active" | "inactive";
  contractStart: string;
  contractEnd: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  assignedTeam: (TeamMember | string)[];
  modules: string[];
  committed: number;
  totalScope: number;
  delivered: number;
  progressPercent: number;
}

// Scope-of-work module keys → readable labels (handles legacy aliases too).
const MODULE_LABELS: Record<string, string> = {
  social: "Social Media",
  paid: "Paid Ads",
  "paid-ads": "Paid Ads",
  email: "Email Marketing",
  whatsapp: "WhatsApp Marketing",
  emailWhatsapp: "Email / WhatsApp",
  seo: "SEO",
  influencer: "Influencer",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchTeam();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch team members", err);
    }
  };

  // Distinct scope modules across all clients, for the scope filter dropdown.
  const availableModules = Array.from(
    new Set(clients.flatMap((c) => c.modules ?? []))
  );

  // Account managers list (ONLY users with role === "account_manager")
  const accountManagers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    teamMembers.forEach((m) => {
      const id = m._id || m.id;
      const primaryRole = (m as any).role ? String((m as any).role).toLowerCase() : "";
      const roles = (m.roles ?? []).map((r) => String(r).toLowerCase().replace(/-/g, "_"));

      if (id && (primaryRole === "account_manager" || roles.includes("account_manager"))) {
        map.set(id, { id, name: m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() });
      }
    });

    clients.forEach((c) => {
      (c.assignedTeam ?? []).forEach((m: any) => {
        if (typeof m === "object" && m !== null) {
          const id = m._id || m.id;
          const primaryRole = m.role ? String(m.role).toLowerCase() : "";
          const roles = (m.roles ?? []).map((r: any) => String(r).toLowerCase().replace(/-/g, "_"));
          const name = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim();

          if (id && name && (primaryRole === "account_manager" || roles.includes("account_manager"))) {
            map.set(id, { id, name });
          }
        }
      });
    });

    return Array.from(map.values());
  }, [teamMembers, clients]);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.brandName.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesScope = scopeFilter === "all" || (c.modules ?? []).includes(scopeFilter);
    const matchesManager =
      managerFilter === "all" ||
      (c.assignedTeam ?? []).some((m: any) => {
        if (typeof m === "string") return m === managerFilter;
        const memberId = m._id || m.id;
        return memberId === managerFilter;
      });

    return matchesSearch && matchesStatus && matchesScope && matchesManager;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Client Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your active brand retainers, scopes of work, and team allocations.
          </p>
        </div>
        <Link href="/dashboard/onboarding">
          <button className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Onboard Client
          </button>
        </Link>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Clients</p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">{clients.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Retainers</p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {clients.filter((c) => c.status === "active").length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Running Month Deliverables</p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {clients.reduce((sum, c) => sum + c.delivered, 0)} / {clients.reduce((sum, c) => sum + c.committed, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by brand name, company, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg bg-white text-gray-700 cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg bg-white text-gray-700 cursor-pointer"
        >
          <option value="all">All scopes</option>
          {availableModules.map((m) => (
            <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg bg-white text-gray-700 cursor-pointer"
        >
          <option value="all">All account managers</option>
          {accountManagers.map((am) => (
            <option key={am.id} value={am.id}>
              {am.name}
            </option>
          ))}
        </select>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Loading client directory...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">No clients found</p>
          <p className="text-xs text-gray-500 mt-1">
            {search ? "Try refining your search query." : "Get started by onboarding your first brand client."}
          </p>
          {!search && (
            <Link href="/dashboard/onboarding">
              <button className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
                <Plus className="w-4 h-4" /> Add Client Now
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => (
            <Link href={`/dashboard/clients/${client.id}`} key={client.id}>
              <div className="bg-white border border-gray-100 hover:border-emerald-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Brand Avatar */}
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0 shadow-sm border border-emerald-100/50 transition-all">
                    {client.brandName.slice(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                        {client.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100/50">
                        {client.industry}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${
                          client.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">Brand: {client.brandName}</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> {client.primaryContact.name} ({client.primaryContact.email})
                      </span>
                      {client.website && (
                        <span className="flex items-center gap-1 text-emerald-600 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" /> Website
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="md:w-64 w-full shrink-0 space-y-1.5 bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500">
                    <span>MONTHLY PROGRESS</span>
                    <span className="text-gray-900">{client.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${client.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>Total Scope: {client.totalScope}</span>
                    <span>Delivered: {client.delivered}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
