"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, ArrowLeft, ArrowRight, UserCheck, ShieldAlert, Award, Globe, PlusCircle } from "lucide-react";

const steps = ["Client Info", "Service Modules", "Scope of Work", "Assign Team", "Review"];

const MODULE_OPTIONS = [
  { key: "socialMedia", label: "Social Media Marketing", desc: "Manage organic posts, reels, and stories across networks" },
  { key: "paidMedia", label: "Paid Performance Ads", desc: "Meta, Google, and LinkedIn ad campaign spend and creative" },
  { key: "emailWhatsapp", label: "Email / WhatsApp Marketing", desc: "Newsletter campaigns, transactional notifications, and automations" },
  { key: "seo", label: "Search Engine Optimization (SEO)", desc: "Keyword research, technical audits, Google Search Console setups" },
  { key: "influencer", label: "Influencer Marketing", desc: "End-to-end influencer collaborations, budgets, and reporting" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [primaryContact, setPrimaryContact] = useState({ name: "", email: "", phone: "" });
  const [aboutBrand, setAboutBrand] = useState("");
  const [requirementNotes, setRequirementNotes] = useState("");

  // Arrays
  const [competitors, setCompetitors] = useState<{ name: string; websiteLink: string; socialMediaLink?: string }[]>([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", websiteLink: "", socialMediaLink: "" });

  const [socialMediaPresence, setSocialMediaPresence] = useState<{ platform: string; link: string }[]>([]);
  const [newSocial, setNewSocial] = useState({ platform: "instagram", link: "" });

  // Modules selection
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    socialMedia: true,
  });

  // Global mode for all social media platforms: breakdown or count
  const [socialMode, setSocialMode] = useState<"breakdown" | "count">("breakdown");

  // Count & category state when in "count" mode
  const [socialCounts, setSocialCounts] = useState<Record<string, { count: number; category: string }>>({
    instagram: { count: 16, category: "custom" },
    facebook: { count: 8, category: "custom" },
    youtube: { count: 4, category: "custom" },
    linkedin: { count: 4, category: "custom" },
    x: { count: 4, category: "custom" },
  });

  // Scope of Work State
  const [scope, setScope] = useState({
    socialMedia: {
      instagram: { reels: 4, posts: 8, stories: 10 },
      facebook: { staticCount: 0, reels: 0, posts: 4, stories: 4 },
      youtube: { staticCount: 0, reels: 2, posts: 0, stories: 0 },
      linkedin: { posts: 4 },
      x: { posts: 4 },
    },
    paidMedia: {
      metaAds: { adSpend: 0, creatives: 0, commission: 0 },
      googleAds: { adSpend: 0, creatives: 0, commission: 0 },
      linkedinAds: { adSpend: 0, creatives: 0, commission: 0 },
    },
    emailWhatsapp: {
      transactional: { enabled: false, triggers: 0 },
      promotional: { enabled: false, emails: 0 },
    },
    seo: {
      keywords: [] as string[],
      gaAccess: { type: "none" as "login" | "email" | "none", details: "" },
      gtmAccess: { type: "none" as "login" | "email" | "none", details: "" },
      gscAccess: { type: "none" as "login" | "email" | "none", details: "" },
      auditSheetLink: "",
      docLink: "",
    },
    influencer: {
      influencersCount: 0,
      commission: 0,
      budget: 0,
    },
  });

  // SEO New Keyword State
  const [newKeyword, setNewKeyword] = useState("");

  // Team state
  const [teamMembers, setTeamMembers] = useState<{ _id: string; name: string; email: string; roles: string[] }[]>([]);
  const [assignedTeam, setAssignedTeam] = useState<string[]>([]);

  useEffect(() => {
    // Fetch available team members
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .catch((err) => console.error("Error loading team", err));
  }, []);

  const addCompetitor = () => {
    if (!newCompetitor.name.trim() || !newCompetitor.websiteLink.trim()) return;
    setCompetitors([...competitors, { ...newCompetitor }]);
    setNewCompetitor({ name: "", websiteLink: "", socialMediaLink: "" });
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const addSocialPresence = () => {
    if (!newSocial.link.trim()) return;
    setSocialMediaPresence([...socialMediaPresence, { ...newSocial }]);
    setNewSocial({ platform: "instagram", link: "" });
  };

  const removeSocialPresence = (index: number) => {
    setSocialMediaPresence(socialMediaPresence.filter((_, i) => i !== index));
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    setScope({
      ...scope,
      seo: {
        ...scope.seo,
        keywords: [...scope.seo.keywords, newKeyword.trim()],
      },
    });
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setScope({
      ...scope,
      seo: {
        ...scope.seo,
        keywords: scope.seo.keywords.filter((k) => k !== kw),
      },
    });
  };

  const toggleModule = (key: string) => {
    setSelectedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTeamToggle = (memberId: string) => {
    setAssignedTeam((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleOnboardSubmit = async () => {
    try {
      // Build clean scope payload based only on toggled modules
      const scopePayload: any = {};
      if (selectedModules.socialMedia) {
        const smPayload: any = {};

        // Instagram
        if (socialMode === "breakdown") {
          smPayload.instagram = scope.socialMedia.instagram;
        } else {
          smPayload.instagram = { reels: 0, posts: 0, stories: 0, custom: 0 };
          smPayload.instagram[socialCounts.instagram.category] = socialCounts.instagram.count;
        }

        // Facebook
        if (socialMode === "breakdown") {
          smPayload.facebook = scope.socialMedia.facebook;
        } else {
          smPayload.facebook = { staticCount: 0, reels: 0, posts: 0, stories: 0, custom: 0 };
          smPayload.facebook[socialCounts.facebook.category] = socialCounts.facebook.count;
        }

        // YouTube
        if (socialMode === "breakdown") {
          smPayload.youtube = scope.socialMedia.youtube;
        } else {
          smPayload.youtube = { staticCount: 0, reels: 0, posts: 0, stories: 0, custom: 0 };
          smPayload.youtube[socialCounts.youtube.category] = socialCounts.youtube.count;
        }

        // LinkedIn
        if (socialMode === "breakdown") {
          smPayload.linkedin = scope.socialMedia.linkedin;
        } else {
          smPayload.linkedin = { posts: 0, custom: 0 };
          smPayload.linkedin[socialCounts.linkedin.category] = socialCounts.linkedin.count;
        }

        // X
        if (socialMode === "breakdown") {
          smPayload.x = scope.socialMedia.x;
        } else {
          smPayload.x = { posts: 0, custom: 0 };
          smPayload.x[socialCounts.x.category] = socialCounts.x.count;
        }

        scopePayload.socialMedia = smPayload;
      }
      if (selectedModules.paidMedia) scopePayload.paidMedia = scope.paidMedia;
      if (selectedModules.emailWhatsapp) scopePayload.emailWhatsapp = scope.emailWhatsapp;
      if (selectedModules.seo) scopePayload.seo = scope.seo;
      if (selectedModules.influencer) scopePayload.influencer = scope.influencer;

      const payload = {
        name,
        brandName,
        industry,
        website,
        contractStart,
        contractEnd,
        primaryContact,
        aboutBrand,
        requirementNotes,
        competitors,
        socialMediaPresence,
        assignedTeam,
        scope: scopePayload,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/dashboard/clients");
      } else {
        const errData = await res.json();
        alert(errData.error || "Onboarding failed");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const canGoNext = () => {
    if (step === 0) {
      return (
        name.trim() !== "" &&
        brandName.trim() !== "" &&
        industry.trim() !== "" &&
        contractStart !== "" &&
        contractEnd !== "" &&
        primaryContact.email.trim() !== ""
      );
    }
    if (step === 1) {
      return Object.values(selectedModules).some(Boolean);
    }
    return true;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Client Onboarding Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up client details, target deliverables, access info, and assign a dedicated project team.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${i <= step
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-gray-150 text-gray-400"
                }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${i <= step ? "text-gray-900 font-semibold" : "text-gray-400"
                }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${i < step ? "bg-emerald-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Main card form content */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        {/* STEP 0: CLIENT INFO */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              1. Brand & Contract Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Company Legal Name *</label>
                <input
                  type="text"
                  placeholder="Acme Corporation Ltd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Brand Public Name *</label>
                <input
                  type="text"
                  placeholder="Acme Brand"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Industry Category *</label>
                <input
                  type="text"
                  placeholder="FinTech, E-Commerce, SaaS, Retail..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Website URL</label>
                <input
                  type="url"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Contract Start Date *</label>
                <input
                  type="date"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Contract Renewal/End Date *</label>
                <input
                  type="date"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 pt-2">
              2. Primary Client Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Contact Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={primaryContact.name}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Contact Email *</label>
                <input
                  type="email"
                  placeholder="john@acme.com"
                  value={primaryContact.email}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={primaryContact.phone}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 pt-2">
              3. Social Presence & Competitors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Brand Social links */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Social Presence Links</label>
                <div className="flex gap-2">
                  <select
                    value={newSocial.platform}
                    onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                    className="px-2 py-2 border border-gray-200 text-xs rounded-lg bg-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X / Twitter</option>
                    <option value="custom">Other Custom Link</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://instagram.com/acme"
                    value={newSocial.link}
                    onChange={(e) => setNewSocial({ ...newSocial, link: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 text-xs rounded-lg placeholder-gray-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addSocialPresence}
                    className="px-3 py-2 bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {socialMediaPresence.map((soc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
                      <span className="capitalize font-semibold text-gray-700">{soc.platform}:</span>
                      <a href={soc.link} target="_blank" className="text-emerald-600 hover:underline truncate max-w-xs">{soc.link}</a>
                      <button type="button" onClick={() => removeSocialPresence(idx)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitors list */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Market Competitors</label>
                <div className="space-y-2 bg-gray-50/50 p-3 border border-gray-100 rounded-lg">
                  <input
                    type="text"
                    placeholder="Competitor Name"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 text-xs rounded-lg placeholder-gray-400 bg-white"
                  />
                  <input
                    type="url"
                    placeholder="Website Link"
                    value={newCompetitor.websiteLink}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, websiteLink: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 text-xs rounded-lg placeholder-gray-400 bg-white"
                  />
                  <input
                    type="url"
                    placeholder="Social Media Link (Optional)"
                    value={newCompetitor.socialMediaLink}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, socialMediaLink: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 text-xs rounded-lg placeholder-gray-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCompetitor}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                  >
                    Add Competitor
                  </button>
                </div>
                <div className="space-y-1.5">
                  {competitors.map((comp, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">{comp.name}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{comp.websiteLink}</p>
                      </div>
                      <button type="button" onClick={() => removeCompetitor(idx)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase">About Brand / General Context</label>
              <textarea
                rows={3}
                placeholder="Core value propositions, tone of voice guidelines, design aesthetics guidelines..."
                value={aboutBrand}
                onChange={(e) => setAboutBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Special Client Requirements & Notes</label>
              <textarea
                rows={3}
                placeholder="Specific onboarding goals, key milestones, exceptions, restrictions..."
                value={requirementNotes}
                onChange={(e) => setRequirementNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
              />
            </div>
          </div>
        )}

        {/* STEP 1: MODULE SELECTION */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Activate Client Service Modules
            </h2>
            <p className="text-xs text-gray-500">
              Select all scope channels that are included in the legal retainer contract.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {MODULE_OPTIONS.map((m) => {
                const active = selectedModules[m.key] || false;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    className={`flex items-start text-left p-4 rounded-xl border-2 transition-all gap-4 ${active
                      ? "border-emerald-600 bg-emerald-50/20"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                  >
                    <div className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 bg-white"
                      }`}>
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{m.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: SCOPE OF WORK BUILDER */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Baseline Scope of Work Settings
            </h2>
            <p className="text-xs text-gray-500">
              Provide committed deliverables quantity per month. Deliverables placeholders will be automatically generated for scheduling.
            </p>

            {/* Social Media Scope Section */}
            {selectedModules.socialMedia && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-gray-800">Social Media Channels</h3>
                  </div>
                  <div className="flex border border-gray-200 rounded overflow-hidden text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSocialMode("breakdown")}
                      className={`px-2 py-0.5 transition-colors cursor-pointer ${socialMode === "breakdown" ? "bg-emerald-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                    >
                      Break-down
                    </button>
                    <button
                      type="button"
                      onClick={() => setSocialMode("count")}
                      className={`px-2 py-0.5 transition-colors cursor-pointer ${socialMode === "count" ? "bg-emerald-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                    >
                      Count
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Instagram */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">Instagram</p>
                    </div>

                    {socialMode === "breakdown" ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Reels</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.instagram.reels}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                instagram: { ...scope.socialMedia.instagram, reels: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Posts</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.instagram.posts}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                instagram: { ...scope.socialMedia.instagram, posts: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Stories</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.instagram.stories}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                instagram: { ...scope.socialMedia.instagram, stories: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Total Count</label>
                          <input
                            type="number" min="0" value={socialCounts.instagram.count}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              instagram: { ...socialCounts.instagram, count: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                          <select
                            value={socialCounts.instagram.category}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              instagram: { ...socialCounts.instagram, category: e.target.value }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          >
                            <option value="custom">Flexible (We Decide)</option>
                            <option value="reels">Reels</option>
                            <option value="posts">Posts</option>
                            <option value="stories">Stories</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Facebook */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">Facebook</p>
                    </div>

                    {socialMode === "breakdown" ? (
                      <div className="grid grid-cols-4 gap-1">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Static</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.facebook.staticCount}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                facebook: { ...scope.socialMedia.facebook, staticCount: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Reels</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.facebook.reels}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                facebook: { ...scope.socialMedia.facebook, reels: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Posts</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.facebook.posts}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                facebook: { ...scope.socialMedia.facebook, posts: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Stories</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.facebook.stories}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                facebook: { ...scope.socialMedia.facebook, stories: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Total Count</label>
                          <input
                            type="number" min="0" value={socialCounts.facebook.count}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              facebook: { ...socialCounts.facebook, count: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                          <select
                            value={socialCounts.facebook.category}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              facebook: { ...socialCounts.facebook, category: e.target.value }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          >
                            <option value="custom">Flexible (We Decide)</option>
                            <option value="staticCount">Static</option>
                            <option value="reels">Reels</option>
                            <option value="posts">Posts</option>
                            <option value="stories">Stories</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* YouTube */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">YouTube</p>
                    </div>

                    {socialMode === "breakdown" ? (
                      <div className="grid grid-cols-4 gap-1">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Static</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.youtube.staticCount}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                youtube: { ...scope.socialMedia.youtube, staticCount: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Reels</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.youtube.reels}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                youtube: { ...scope.socialMedia.youtube, reels: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Posts</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.youtube.posts}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                youtube: { ...scope.socialMedia.youtube, posts: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Stories</label>
                          <input
                            type="number" min="0" value={scope.socialMedia.youtube.stories}
                            onChange={(e) => setScope({
                              ...scope,
                              socialMedia: {
                                ...scope.socialMedia,
                                youtube: { ...scope.socialMedia.youtube, stories: parseInt(e.target.value) || 0 }
                              }
                            })}
                            className="w-full p-0.5 border text-[10px] rounded bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Total Count</label>
                          <input
                            type="number" min="0" value={socialCounts.youtube.count}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              youtube: { ...socialCounts.youtube, count: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                          <select
                            value={socialCounts.youtube.category}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              youtube: { ...socialCounts.youtube, category: e.target.value }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          >
                            <option value="custom">Flexible (We Decide)</option>
                            <option value="staticCount">Static (Posts)</option>
                            <option value="reels">Shorts</option>
                            <option value="posts">Videos</option>
                            <option value="stories">Stories</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">LinkedIn</p>
                    </div>

                    {socialMode === "breakdown" ? (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Posts per month</label>
                        <input
                          type="number" min="0" value={scope.socialMedia.linkedin.posts}
                          onChange={(e) => setScope({
                            ...scope,
                            socialMedia: {
                              ...scope.socialMedia,
                              linkedin: { posts: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Total Count</label>
                          <input
                            type="number" min="0" value={socialCounts.linkedin.count}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              linkedin: { ...socialCounts.linkedin, count: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                          <select
                            value={socialCounts.linkedin.category}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              linkedin: { ...socialCounts.linkedin, category: e.target.value }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          >
                            <option value="custom">Flexible (We Decide)</option>
                            <option value="posts">Posts</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* X (Twitter) */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">X (Twitter)</p>
                    </div>

                    {socialMode === "breakdown" ? (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Posts per month</label>
                        <input
                          type="number" min="0" value={scope.socialMedia.x.posts}
                          onChange={(e) => setScope({
                            ...scope,
                            socialMedia: {
                              ...scope.socialMedia,
                              x: { posts: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Total Count</label>
                          <input
                            type="number" min="0" value={socialCounts.x.count}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              x: { ...socialCounts.x, count: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                          <select
                            value={socialCounts.x.category}
                            onChange={(e) => setSocialCounts({
                              ...socialCounts,
                              x: { ...socialCounts.x, category: e.target.value }
                            })}
                            className="w-full p-1 border text-xs rounded bg-white text-gray-800"
                          >
                            <option value="custom">Flexible (We Decide)</option>
                            <option value="posts">Posts</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Paid Media Scope Section */}
            {selectedModules.paidMedia && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-800">Paid Media Campaigns</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Meta Ads */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-gray-700">Meta Ads</p>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Monthly Budget ($)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.metaAds.adSpend}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              metaAds: { ...scope.paidMedia.metaAds, adSpend: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Creatives Target</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.metaAds.creatives}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              metaAds: { ...scope.paidMedia.metaAds, creatives: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Agency Comm (%)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.metaAds.commission}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              metaAds: { ...scope.paidMedia.metaAds, commission: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Google Ads */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-gray-700">Google Ads</p>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Monthly Budget ($)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.googleAds.adSpend}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              googleAds: { ...scope.paidMedia.googleAds, adSpend: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Creatives Target</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.googleAds.creatives}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              googleAds: { ...scope.paidMedia.googleAds, creatives: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Agency Comm (%)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.googleAds.commission}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              googleAds: { ...scope.paidMedia.googleAds, commission: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn Ads */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-gray-700">LinkedIn Ads</p>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Monthly Budget ($)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.linkedinAds.adSpend}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              linkedinAds: { ...scope.paidMedia.linkedinAds, adSpend: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Creatives Target</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.linkedinAds.creatives}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              linkedinAds: { ...scope.paidMedia.linkedinAds, creatives: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Agency Comm (%)</label>
                        <input
                          type="number" min="0" value={scope.paidMedia.linkedinAds.commission}
                          onChange={(e) => setScope({
                            ...scope,
                            paidMedia: {
                              ...scope.paidMedia,
                              linkedinAds: { ...scope.paidMedia.linkedinAds, commission: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email / WhatsApp Marketing */}
            {selectedModules.emailWhatsapp && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-800">Email & WhatsApp Marketing</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Transactional */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">Transactional Email Setup</p>
                      <input
                        type="checkbox"
                        checked={scope.emailWhatsapp.transactional.enabled}
                        onChange={(e) => setScope({
                          ...scope,
                          emailWhatsapp: {
                            ...scope.emailWhatsapp,
                            transactional: { ...scope.emailWhatsapp.transactional, enabled: e.target.checked }
                          }
                        })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </div>
                    {scope.emailWhatsapp.transactional.enabled && (
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Number of Trigger Flows</label>
                        <input
                          type="number" min="0" value={scope.emailWhatsapp.transactional.triggers}
                          onChange={(e) => setScope({
                            ...scope,
                            emailWhatsapp: {
                              ...scope.emailWhatsapp,
                              transactional: { ...scope.emailWhatsapp.transactional, triggers: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Promotional */}
                  <div className="bg-gray-50/50 p-3 border border-gray-100 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">Promotional Campaigns</p>
                      <input
                        type="checkbox"
                        checked={scope.emailWhatsapp.promotional.enabled}
                        onChange={(e) => setScope({
                          ...scope,
                          emailWhatsapp: {
                            ...scope.emailWhatsapp,
                            promotional: { ...scope.emailWhatsapp.promotional, enabled: e.target.checked }
                          }
                        })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </div>
                    {scope.emailWhatsapp.promotional.enabled && (
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase block">Total Email Blasts / Mo</label>
                        <input
                          type="number" min="0" value={scope.emailWhatsapp.promotional.emails}
                          onChange={(e) => setScope({
                            ...scope,
                            emailWhatsapp: {
                              ...scope.emailWhatsapp,
                              promotional: { ...scope.emailWhatsapp.promotional, emails: parseInt(e.target.value) || 0 }
                            }
                          })}
                          className="w-full p-1 border text-xs rounded bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Section */}
            {selectedModules.seo && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-800">Search Engine Optimization (SEO)</h3>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Target Keyword List</label>
                  <div className="flex gap-2">
                    <input
                      type="text" placeholder="e.g. accounting software for startups"
                      value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                      className="flex-1 p-2 border text-xs rounded-lg bg-white"
                    />
                    <button
                      type="button" onClick={addKeyword}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg"
                    >
                      Add Keyword
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {scope.seo.keywords.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {k}
                        <button type="button" onClick={() => removeKeyword(k)} className="text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-50 pt-4">
                  {/* Google Analytics */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Google Analytics Access</label>
                    <select
                      value={scope.seo.gaAccess.type}
                      onChange={(e) => setScope({
                        ...scope,
                        seo: { ...scope.seo, gaAccess: { ...scope.seo.gaAccess, type: e.target.value as any } }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    >
                      <option value="none">No Access</option>
                      <option value="email">Added on Email</option>
                      <option value="login">Credentials Provided</option>
                    </select>
                    {scope.seo.gaAccess.type !== "none" && (
                      <input
                        type="text" placeholder="Access email or notes"
                        value={scope.seo.gaAccess.details}
                        onChange={(e) => setScope({
                          ...scope,
                          seo: { ...scope.seo, gaAccess: { ...scope.seo.gaAccess, details: e.target.value } }
                        })}
                        className="w-full p-1.5 border text-xs rounded bg-white mt-1"
                      />
                    )}
                  </div>

                  {/* Google Tag Manager */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Google Tag Manager</label>
                    <select
                      value={scope.seo.gtmAccess.type}
                      onChange={(e) => setScope({
                        ...scope,
                        seo: { ...scope.seo, gtmAccess: { ...scope.seo.gtmAccess, type: e.target.value as any } }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    >
                      <option value="none">No Access</option>
                      <option value="email">Added on Email</option>
                      <option value="login">Credentials Provided</option>
                    </select>
                    {scope.seo.gtmAccess.type !== "none" && (
                      <input
                        type="text" placeholder="Access email or notes"
                        value={scope.seo.gtmAccess.details}
                        onChange={(e) => setScope({
                          ...scope,
                          seo: { ...scope.seo, gtmAccess: { ...scope.seo.gtmAccess, details: e.target.value } }
                        })}
                        className="w-full p-1.5 border text-xs rounded bg-white mt-1"
                      />
                    )}
                  </div>

                  {/* Google Search Console */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Google Search Console</label>
                    <select
                      value={scope.seo.gscAccess.type}
                      onChange={(e) => setScope({
                        ...scope,
                        seo: { ...scope.seo, gscAccess: { ...scope.seo.gscAccess, type: e.target.value as any } }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    >
                      <option value="none">No Access</option>
                      <option value="email">Added on Email</option>
                      <option value="login">Credentials Provided</option>
                    </select>
                    {scope.seo.gscAccess.type !== "none" && (
                      <input
                        type="text" placeholder="Access email or notes"
                        value={scope.seo.gscAccess.details}
                        onChange={(e) => setScope({
                          ...scope,
                          seo: { ...scope.seo, gscAccess: { ...scope.seo.gscAccess, details: e.target.value } }
                        })}
                        className="w-full p-1.5 border text-xs rounded bg-white mt-1"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Audit Google Sheet Link</label>
                    <input
                      type="url" placeholder="https://docs.google.com/spreadsheets/..."
                      value={scope.seo.auditSheetLink}
                      onChange={(e) => setScope({
                        ...scope,
                        seo: { ...scope.seo, auditSheetLink: e.target.value }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Creative Content Shared Doc</label>
                    <input
                      type="url" placeholder="https://docs.google.com/document/..."
                      value={scope.seo.docLink}
                      onChange={(e) => setScope({
                        ...scope,
                        seo: { ...scope.seo, docLink: e.target.value }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Influencer Marketing Section */}
            {selectedModules.influencer && (
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-800">Influencer Marketing campaigns</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Influencers count / Month</label>
                    <input
                      type="number" min="0" value={scope.influencer.influencersCount}
                      onChange={(e) => setScope({
                        ...scope,
                        influencer: { ...scope.influencer, influencersCount: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Influencer Budget ($)</label>
                    <input
                      type="number" min="0" value={scope.influencer.budget}
                      onChange={(e) => setScope({
                        ...scope,
                        influencer: { ...scope.influencer, budget: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Agency Commission ($)</label>
                    <input
                      type="number" min="0" value={scope.influencer.commission}
                      onChange={(e) => setScope({
                        ...scope,
                        influencer: { ...scope.influencer, commission: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full p-2 border text-xs rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ASSIGN TEAM */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Assign Dedicated Project Team
            </h2>
            <p className="text-xs text-gray-500">
              Select team members who will have access to manage and complete deliverables for this client.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {teamMembers.map((member) => {
                const assigned = assignedTeam.includes(member._id);
                return (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => handleTeamToggle(member._id)}
                    className={`flex items-center text-left p-3 border rounded-xl transition-all justify-between ${assigned
                      ? "border-emerald-600 bg-emerald-50/10"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{member.name}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[180px]">{member.email}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${assigned ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300"
                      }`}>
                      {assigned && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
              {teamMembers.length === 0 && (
                <p className="text-xs text-gray-500 italic p-4">No team members available. Go to Team Management first.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SAVE */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
              Final Review
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Company Bio</p>
                <div className="border border-gray-150 rounded-xl p-4 space-y-2 bg-gray-50/50">
                  <p className="text-sm font-bold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-600">Industry: <span className="font-semibold">{industry}</span></p>
                  {website && <p className="text-xs text-gray-600">Website: <a className="text-emerald-600 hover:underline">{website}</a></p>}
                  <p className="text-xs text-gray-600">Contract: <span className="font-semibold">{contractStart} → {contractEnd}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Primary Contact</p>
                <div className="border border-gray-150 rounded-xl p-4 space-y-1.5 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-900">{primaryContact.name || "—"}</p>
                  <p className="text-xs text-gray-500">{primaryContact.email}</p>
                  {primaryContact.phone && <p className="text-xs text-gray-500">{primaryContact.phone}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active retainer modules</p>
              <div className="flex flex-wrap gap-2">
                {MODULE_OPTIONS.filter((m) => selectedModules[m.key]).map((m) => (
                  <span key={m.key} className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {selectedModules.socialMedia && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configured Social Scope Summary</p>
                <div className="border border-gray-150 rounded-xl p-4 space-y-2 bg-gray-50/30 text-xs">
                  {/* Instagram */}
                  <div>
                    <span className="font-bold text-gray-700">Instagram: </span>
                    {socialMode === "breakdown" ? (
                      <span className="text-gray-600">
                        Breakdown ({scope.socialMedia.instagram.reels} Reels, {scope.socialMedia.instagram.posts} Posts, {scope.socialMedia.instagram.stories} Stories)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Total Count ({socialCounts.instagram.count} Deliverables - <span className="capitalize">{socialCounts.instagram.category === "custom" ? "Flexible (We Decide)" : socialCounts.instagram.category}</span>)
                      </span>
                    )}
                  </div>
                  {/* Facebook */}
                  <div>
                    <span className="font-bold text-gray-700">Facebook: </span>
                    {socialMode === "breakdown" ? (
                      <span className="text-gray-600">
                        Breakdown ({scope.socialMedia.facebook.staticCount} Static, {scope.socialMedia.facebook.reels} Reels, {scope.socialMedia.facebook.posts} Posts, {scope.socialMedia.facebook.stories} Stories)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Total Count ({socialCounts.facebook.count} Deliverables - <span className="capitalize">{socialCounts.facebook.category === "custom" ? "Flexible (We Decide)" : socialCounts.facebook.category === "staticCount" ? "Static" : socialCounts.facebook.category}</span>)
                      </span>
                    )}
                  </div>
                  {/* YouTube */}
                  <div>
                    <span className="font-bold text-gray-700">YouTube: </span>
                    {socialMode === "breakdown" ? (
                      <span className="text-gray-600">
                        Breakdown ({scope.socialMedia.youtube.staticCount} Static, {scope.socialMedia.youtube.reels} Reels, {scope.socialMedia.youtube.posts} Posts, {scope.socialMedia.youtube.stories} Stories)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Total Count ({socialCounts.youtube.count} Deliverables - <span className="capitalize">{socialCounts.youtube.category === "custom" ? "Flexible (We Decide)" : socialCounts.youtube.category === "staticCount" ? "Static" : socialCounts.youtube.category === "reels" ? "Shorts" : socialCounts.youtube.category === "posts" ? "Videos" : socialCounts.youtube.category}</span>)
                      </span>
                    )}
                  </div>
                  {/* LinkedIn */}
                  <div>
                    <span className="font-bold text-gray-700">LinkedIn: </span>
                    {socialMode === "breakdown" ? (
                      <span className="text-gray-600">
                        Breakdown ({scope.socialMedia.linkedin.posts} Posts)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Total Count ({socialCounts.linkedin.count} Deliverables - <span className="capitalize">{socialCounts.linkedin.category === "custom" ? "Flexible (We Decide)" : "Posts"}</span>)
                      </span>
                    )}
                  </div>
                  {/* X */}
                  <div>
                    <span className="font-bold text-gray-700">X (Twitter): </span>
                    {socialMode === "breakdown" ? (
                      <span className="text-gray-600">
                        Breakdown ({scope.socialMedia.x.posts} Posts)
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Total Count ({socialCounts.x.count} Deliverables - <span className="capitalize">{socialCounts.x.category === "custom" ? "Flexible (We Decide)" : "Posts"}</span>)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned internal team</p>
              <div className="flex flex-wrap gap-2">
                {assignedTeam.map((id) => {
                  const m = teamMembers.find((t) => t._id === id);
                  return m ? (
                    <span key={id} className="text-xs font-semibold px-2.5 py-1 bg-gray-150 text-gray-700 rounded-full">
                      {m.name}
                    </span>
                  ) : null;
                })}
                {assignedTeam.length === 0 && <span className="text-xs text-gray-400 italic">No team members assigned yet.</span>}
              </div>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg disabled:opacity-50 transition-all flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              disabled={!canGoNext()}
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOnboardSubmit}
              className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
            >
              <UserCheck className="w-4 h-4" /> Create Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
