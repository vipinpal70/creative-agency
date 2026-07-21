"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, ArrowLeft, ArrowRight, UserCheck, ShieldAlert, Award, Globe, PlusCircle } from "lucide-react";
import instagram from "@/app/assets/instagram.png";
import facebook from "@/app/assets/facebook.png";
import whatsapp from "@/app/assets/whatsapp.png";
import linkedin from "@/app/assets/linkedin.png";
import twitter from "@/app/assets/twitter.png";
import youtube from "@/app/assets/youtube.png";
import { SOCIAL_DELIVERABLE_OPTIONS } from "@/lib/scope-constants";

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
  const [clientPassword, setClientPassword] = useState("");
  const [generateCredentials, setGenerateCredentials] = useState(true);
  const [onboardSuccess, setOnboardSuccess] = useState<{ email: string; password?: string } | null>(null);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pw = "";
    for (let i = 0; i < 10; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pw;
  };

  // Seed a system-generated password once when the admin first reaches the
  // review step. After that we never auto-fill again, so clearing the field to
  // type a custom password (or leaving it blank) sticks.
  const passwordSeeded = useRef(false);
  useEffect(() => {
    if (step === 4 && generateCredentials && !passwordSeeded.current) {
      passwordSeeded.current = true;
      if (!clientPassword) setClientPassword(generateRandomPassword());
    }
  }, [step, generateCredentials, clientPassword]);

  // Form State
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [noEndDate, setNoEndDate] = useState(false); // open-ended contract (no fixed end date)
  const [primaryContact, setPrimaryContact] = useState({ name: "", email: "", phone: "", altPhone: "" });
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

  const [scopeItems, setScopeItems] = useState<any[]>([]);

  const updateScopeItem = (id: string, patch: any) => {
    setScopeItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const deleteScopeItem = (id: string) => {
    setScopeItems((prev) => prev.filter((s) => s.id !== id));
  };

  const togglePlatform = (itemId: string, platform: string) => {
    setScopeItems((prev) =>
      prev.map((s) => {
        if (s.id !== itemId) return s;
        const platforms = s.platforms || [];
        const nextPlatforms = platforms.includes(platform)
          ? platforms.filter((p: string) => p !== platform)
          : [...platforms, platform];
        return { ...s, platforms: nextPlatforms };
      })
    );
  };

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

  const handleNextStep = () => {
    if (step === 1) {
      // Seed default items for active modules if empty
      const nextItems = [...scopeItems];

      if (selectedModules.socialMedia) {
        const hasSocial = nextItems.some((s) => s.module === "social");
        if (!hasSocial) {
          nextItems.push(
            { id: "social-reel", module: "social", label: "reel", unit: "8", platforms: ["instagram"] },
            { id: "social-story", module: "social", label: "story", unit: "8", platforms: ["instagram"] },
            { id: "social-static", module: "social", label: "static/image", unit: "6", platforms: ["instagram", "facebook"] },
            { id: "social-carousel", module: "social", label: "carousel", unit: "4", platforms: ["instagram", "facebook"] }
          );
        }
      }
      if (selectedModules.paidMedia) {
        const hasPaid = nextItems.some((s) => s.module === "paid");
        if (!hasPaid) {
          nextItems.push(
            { id: "paid-meta", module: "paid", label: "Meta Ad Creatives", unit: "4" },
            { id: "paid-google", module: "paid", label: "Google Ads Copy", unit: "2" }
          );
        }
      }
      if (selectedModules.emailWhatsapp) {
        const hasEmail = nextItems.some((s) => s.module === "email");
        if (!hasEmail) {
          nextItems.push(
            { id: "email-promo", module: "email", label: "Promotional Campaigns", unit: "4" },
            { id: "email-trans", module: "email", label: "Transactional Flows", unit: "1" }
          );
        }
      }
      if (selectedModules.seo) {
        const hasSeo = nextItems.some((s) => s.module === "seo");
        if (!hasSeo) {
          // Technical SEO Audits is opt-in via a checkbox, so it is NOT seeded here.
          nextItems.push(
            { id: "seo-blogs", module: "seo", label: "SEO Blog Posts", unit: "4" }
          );
        }
      }
      if (selectedModules.influencer) {
        const hasInfluencer = nextItems.some((s) => s.module === "influencer");
        if (!hasInfluencer) {
          nextItems.push(
            { id: "influencer-campaigns", module: "influencer", label: "Influencer Campaigns", unit: "2" }
          );
        }
      }

      setScopeItems(nextItems);
    }
    setStep(step + 1);
  };

  const handleOnboardSubmit = async () => {
    try {
      const activeModuleKeys = Object.keys(selectedModules)
        .filter((k) => selectedModules[k])
        .map((k) =>
          k === "socialMedia" ? "social" :
            k === "paidMedia" ? "paid" :
              k === "emailWhatsapp" ? "email" :
                k === "seo" ? "seo" :
                  k === "influencer" ? "influencer" : k
        );

      const filteredItems = scopeItems.filter((item) => activeModuleKeys.includes(item.module));

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
        scope: { items: filteredItems },
        clientUser: generateCredentials
          ? { email: primaryContact.email, password: clientPassword }
          : undefined,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOnboardSuccess({
          email: primaryContact.email,
          password: generateCredentials ? clientPassword : undefined,
        });
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
        (noEndDate || contractEnd !== "") &&
        primaryContact.email.trim() !== "" &&
        primaryContact.phone.trim() !== ""
      );
    }
    if (step === 1) {
      return Object.values(selectedModules).some(Boolean);
    }
    return true;
  };

  if (onboardSuccess) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-gray-150 p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Client Onboarded Successfully!</h1>
          <p className="text-xs text-gray-500">
            The client profile and scope of work have been created.
          </p>
        </div>

        {onboardSuccess.password ? (
          <div className="border border-gray-150 rounded-xl p-5 bg-gray-50/50 space-y-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Client Portal Sign-In Credentials</h2>
            <p className="text-[11px] text-gray-500">
              Share these login details with the client so they can access the client side portal.
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Email</span>
                <span className="font-semibold text-gray-800">{onboardSuccess.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Password</span>
                <span className="font-semibold text-gray-800 bg-white px-2 py-1 rounded border border-gray-100 select-all font-mono">{onboardSuccess.password}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Role</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Client</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `Client Portal Login Details:\nEmail: ${onboardSuccess.email}\nPassword: ${onboardSuccess.password}\nLogin URL: ${window.location.origin}/sign-in`
                );
                alert("Credentials copied to clipboard!");
              }}
              className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg transition-all"
            >
              Copy to Clipboard
            </button>
          </div>
        ) : (
          <div className="border border-gray-150 rounded-xl p-5 bg-gray-50/50 text-center text-xs text-gray-500">
            No login account was generated. You can create one anytime under Team Management.
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push("/dashboard/clients")}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
        >
          Go to Clients list
        </button>
      </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Client Onboarding Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up client details, target deliverables, access info, and assign a dedicated project team.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${i <= step
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
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Company Legal Name *</label>
                <input
                  type="text"
                  placeholder="Acme Corporation Ltd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Brand Public Name *</label>
                <input
                  type="text"
                  placeholder="Acme Brand"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Industry Category *</label>
                <input
                  type="text"
                  placeholder="FinTech, E-Commerce, SaaS, Retail..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Website URL</label>
                <input
                  type="url"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Contract Start Date *</label>
                <input
                  type="date"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase">Contract Renewal/End Date</label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-medium text-gray-400">
                    <input
                      type="checkbox"
                      checked={noEndDate}
                      onChange={(e) => { setNoEndDate(e.target.checked); if (e.target.checked) setContractEnd(""); }}
                      className="w-3 h-3 accent-emerald-600"
                    />
                    Not defined
                  </label>
                </div>
                <input
                  type="date"
                  value={contractEnd}
                  disabled={noEndDate}
                  onChange={(e) => setContractEnd(e.target.value)}
                  placeholder={noEndDate ? "Open-ended / ongoing" : undefined}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white disabled:bg-gray-50 disabled:text-gray-300"
                />
              </div>
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2 pt-2">
              2. Primary Client Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Contact Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={primaryContact.name}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Contact Email *</label>
                <input
                  type="email"
                  placeholder="john@acme.com"
                  value={primaryContact.email}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Contact Phone *</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={primaryContact.phone}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Alternative Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-0000"
                  value={primaryContact.altPhone}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, altPhone: e.target.value })}
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
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Social Presence Links</label>
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
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Market Competitors</label>
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
              <label className="text-[11px] font-semibold text-gray-500 uppercase">About Brand / General Context</label>
              <textarea
                rows={3}
                placeholder="Core value propositions, tone of voice guidelines, design aesthetics guidelines..."
                value={aboutBrand}
                onChange={(e) => setAboutBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 transition-all bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase">Special Client Requirements & Notes</label>
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
                      <p className="text-xs font-semibold text-gray-900">{m.label}</p>
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
              Provide deliverables quantity per month. Deliverables placeholders will be automatically generated for scheduling.
            </p>

            {Object.keys(selectedModules).filter((k) => selectedModules[k]).map((modKey) => {
              const dbModule =
                modKey === "socialMedia" ? "social" :
                  modKey === "paidMedia" ? "paid" :
                    modKey === "emailWhatsapp" ? "email" :
                      modKey === "seo" ? "seo" :
                        modKey === "influencer" ? "influencer" : modKey;

              const meta = [
                { key: "social", label: "Social Media Marketing", color: "emerald" },
                { key: "paid", label: "Paid Performance Ads", color: "blue" },
                { key: "email", label: "Email / WhatsApp Marketing", color: "purple" },
                { key: "seo", label: "Search Engine Optimization (SEO)", color: "indigo" },
                { key: "influencer", label: "Influencer Marketing", color: "amber" },
              ].find((m) => m.key === dbModule) || { key: dbModule, label: modKey, color: "gray" };

              const items = scopeItems.filter((s) => s.module === dbModule);

              return (
                <div key={dbModule} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full bg-${meta.color}-500`} />
                      <h3 className="text-xs font-semibold text-gray-800">{meta.label}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {dbModule === "seo" && (
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={items.some((s) => s.id === "seo-audits" || s.label === "Technical SEO Audits")}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setScopeItems((prev) => [
                                  ...prev,
                                  { id: "seo-audits", module: "seo", label: "Technical SEO Audits", unit: "1", platforms: [] },
                                ]);
                              } else {
                                setScopeItems((prev) => prev.filter((s) => !(s.id === "seo-audits" || s.label === "Technical SEO Audits")));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-emerald-600"
                          />
                          Technical SEO Audits
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setScopeItems((prev) => [
                            ...prev,
                            {
                              id: `${dbModule}-${crypto.randomUUID().slice(0, 6)}`,
                              module: dbModule,
                              label: dbModule === "social" ? "reel/story" : "",
                              unit: "1",
                              platforms: dbModule === "social" ? ["instagram"] : [],
                            },
                          ]);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>
                  </div>

                  {items.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No scope items added yet.</p>
                  )}

                  <div className="space-y-4">
                    {items.map((s) => (
                      <div key={s.id} className="grid grid-cols-12 gap-3 items-end border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        {dbModule === "social" ? (
                          <>
                            {/* Deliverable Dropdown */}
                            <div className="col-span-12 sm:col-span-3 space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase">Deliverable</label>
                              <select
                                value={s.label}
                                onChange={(e) => updateScopeItem(s.id, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg bg-white"
                              >
                                <option value="">Select...</option>
                                {SOCIAL_DELIVERABLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Unit Input */}
                            <div className="col-span-4 sm:col-span-2 space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase">Unit</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={s.unit || ""}
                                onChange={(e) => updateScopeItem(s.id, { unit: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg"
                              />
                            </div>

                            {/* Platforms */}
                            <div className="col-span-12 sm:col-span-4 space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase">Platforms</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {[
                                  { key: "instagram", icon: instagram, label: "Instagram" },
                                  { key: "facebook", icon: facebook, label: "Facebook" },
                                  { key: "linkedin", icon: linkedin, label: "LinkedIn" },
                                  { key: "youtube", icon: youtube, label: "YouTube" },
                                  { key: "x", icon: twitter, label: "X" },
                                ].map((p) => {
                                  const selected = (s.platforms || []).includes(p.key);
                                  return (
                                    <button
                                      key={p.key}
                                      type="button"
                                      onClick={() => togglePlatform(s.id, p.key)}
                                      title={p.label}
                                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${selected
                                        ? "bg-emerald-50 border-emerald-300 scale-105"
                                        : "bg-gray-50/50 border-gray-200 hover:bg-gray-100 opacity-60 hover:opacity-100"
                                        }`}
                                    >
                                      <img
                                        src={p.icon.src}
                                        alt={p.label}
                                        className={`w-5 h-5 object-contain transition-transform ${selected ? "scale-110" : ""}`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                          </>
                        ) : (
                          <>
                            {/* Deliverable Input */}
                            <div className="col-span-12 sm:col-span-6 space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase">Deliverable</label>
                              <input
                                type="text"
                                placeholder="e.g. Meta Ad Creatives, Blogs per month, etc."
                                value={s.label}
                                onChange={(e) => updateScopeItem(s.id, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg"
                              />
                            </div>

                            {/* Unit / Qty */}
                            <div className="col-span-6 sm:col-span-3 space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase">Qty / mo</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={s.unit || ""}
                                onChange={(e) => updateScopeItem(s.id, { unit: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg"
                              />
                            </div>
                          </>
                        )}

                        {/* Delete button */}
                        <div className="col-span-12 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => deleteScopeItem(s.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center shrink-0">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{member.name}</p>
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Company Bio</p>
                <div className="border border-gray-150 rounded-xl p-4 space-y-2 bg-gray-50/50">
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-600">Industry: <span className="font-semibold">{industry}</span></p>
                  {website && <p className="text-xs text-gray-600">Website: <a className="text-emerald-600 hover:underline">{website}</a></p>}
                  <p className="text-xs text-gray-600">Contract: <span className="font-semibold">{contractStart} → {contractEnd || "Ongoing"}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Primary Contact</p>
                <div className="border border-gray-150 rounded-xl p-4 space-y-1.5 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-900">{primaryContact.name || "—"}</p>
                  <p className="text-xs text-gray-500">{primaryContact.email}</p>
                  {primaryContact.phone && <p className="text-xs text-gray-500">{primaryContact.phone}</p>}
                  {primaryContact.altPhone && <p className="text-xs text-gray-500">Alt: {primaryContact.altPhone}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active retainer modules</p>
              <div className="flex flex-wrap gap-2">
                {MODULE_OPTIONS.filter((m) => selectedModules[m.key]).map((m) => (
                  <span key={m.key} className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            {Object.keys(selectedModules).filter((k) => selectedModules[k]).map((modKey) => {
              const dbModule =
                modKey === "socialMedia" ? "social" :
                  modKey === "paidMedia" ? "paid" :
                    modKey === "emailWhatsapp" ? "email" :
                      modKey === "seo" ? "seo" :
                        modKey === "influencer" ? "influencer" : modKey;

              const moduleItems = scopeItems.filter((s) => s.module === dbModule);
              const meta = [
                { key: "social", label: "Social Media Marketing" },
                { key: "paid", label: "Paid Performance Ads" },
                { key: "email", label: "Email / WhatsApp Marketing" },
                { key: "seo", label: "Search Engine Optimization (SEO)" },
                { key: "influencer", label: "Influencer Marketing" },
              ].find((x) => x.key === dbModule);

              return (
                <div key={modKey} className="space-y-3 animate-fade-in">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{meta?.label || modKey} Scope Summary</p>
                  <div className="border border-gray-150 rounded-xl p-4 space-y-2 bg-gray-50/30 text-xs">
                    {moduleItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0 last:pb-0">
                        <div>
                          <span className="font-semibold text-gray-700">{item.label || "Unnamed Deliverable"}</span>
                          {item.module === "social" && item.platforms && item.platforms.length > 0 && (
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2 font-semibold uppercase border border-emerald-100">
                              {item.platforms.join(", ")}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-600 font-medium">
                          {item.unit || "0"} / mo
                        </span>
                      </div>
                    ))}
                    {moduleItems.length === 0 && (
                      <p className="text-gray-400 italic">No scope items added for this module.</p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned internal team</p>
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

            <div className="border border-emerald-100 rounded-xl p-5 bg-emerald-50/10 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Client Portal Access</h3>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateCredentials}
                    onChange={(e) => setGenerateCredentials(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-semibold text-gray-600">Create client user account</span>
                </label>
              </div>

              {generateCredentials && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Sign-in Email</label>
                    <input
                      type="email"
                      readOnly
                      value={primaryContact.email}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-medium"
                    />
                    <p className="text-[9px] text-gray-400">Uses the primary contact email provided in Step 1.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Sign-in Password</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/10 focus:border-emerald-600 font-medium text-gray-900 bg-white"
                        placeholder="Set password"
                      />
                      <button
                        type="button"
                        onClick={() => setClientPassword(generateRandomPassword())}
                        className="px-2.5 py-2 border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              onClick={handleNextStep}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOnboardSubmit}
              className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1"
            >
              <UserCheck className="w-4 h-4" /> Create Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
