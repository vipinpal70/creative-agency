// app/page.tsx
import Link from "next/link";
import { getSession } from "@/lib/auth";

const features = [
  { icon: "👥", title: "Client Onboarding",    description: "Seamlessly onboard new clients with structured forms, document uploads, and automated workflows." },
  { icon: "📋", title: "Project Management",   description: "Track projects with Gantt charts, timelines, and real-time status updates across your entire team." },
  { icon: "✅", title: "Task Board",           description: "Organize deliverables, assign team members, and manage feedback loops in one centralized hub." },
  { icon: "📝", title: "Approval Workflows",   description: "Streamline internal and client approvals with automated notifications and version control." },
  { icon: "📅", title: "Content Calendar",     description: "Visualize your entire content pipeline with a beautiful calendar view and drag-drop scheduling." },
  { icon: "🎨", title: "Creative Upload",      description: "Upload and manage creative assets with media preview, feedback, and client review capabilities." },
  { icon: "📊", title: "Analytics & Reporting",description: "Track team productivity, approval rates, and turnaround times with comprehensive analytics." },
  { icon: "🖥️", title: "Unified Dashboard",   description: "Bird's-eye view of active clients, open tasks, pending approvals, and project status." },
];

const benefits = [
  { icon: "⚡", title: "Lightning Fast",    description: "Built for speed with optimized performance and instant updates." },
  { icon: "🔒", title: "Secure & Reliable", description: "Enterprise-grade security with role-based access control." },
  { icon: "⏱️", title: "Save 70% Time",   description: "Automate workflows and eliminate repetitive manual work." },
];

const stats = [
  { value: "10x", label: "Faster Approvals" },
  { value: "70%", label: "Time Saved" },
  { value: "99%", label: "Client Satisfaction" },
  { value: "24/7", label: "Support" },
];

const steps = [
  { num: 1, title: "Onboard Your Clients",  description: "Create client profiles, upload brand guidelines, and set up project requirements in minutes." },
  { num: 2, title: "Manage & Create",        description: "Assign tasks, track progress with Gantt charts, and manage deliverables across your team." },
  { num: 3, title: "Deliver & Approve",      description: "Streamline approvals, collect feedback, and publish content with automated workflows." },
];

const footerLinks = {
  Product: ["Features", "Pricing", "Demo"],
  Company: ["About", "Blog", "Contact"],
  Legal:   ["Privacy", "Terms", "Security"],
};

const avatarColors = ["bg-indigo-500", "bg-violet-500", "bg-purple-400", "bg-indigo-300"];

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased overflow-x-hidden">

      {/* ── Gradient Mesh Background ─────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-indigo-200/30 blur-[120px] animate-pulse" />
        <div className="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full bg-violet-200/25 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-100/20 blur-[80px]" />
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
              C
            </div>
            <span className="font-bold text-[1.0625rem] tracking-tight text-gray-900">
              Creative<span className="text-indigo-600">OS</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features"     className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">How It Works</a>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {!session ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-indigo-600 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 px-4 py-2 rounded-full transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/admin/sign-up"
                  className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-4 py-2 rounded-full shadow-md shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-500 text-gray-400 capitalize">{session.role}</span>
                <span className="text-sm font-semibold text-gray-700">{session.email}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <main className="relative z-10">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="pt-36 pb-20 px-6">
          <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-6">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Creative Agency Management Platform
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.07] text-gray-900 max-w-4xl">
              Manage Your Agency{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                Faster & Smarter
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl">
              Streamline your creative workflow with an all-in-one platform for client onboarding,
              project management, approvals, and team collaboration.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {!session ? (
                <>
                  <Link
                    href="/admin/sign-up"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Get Started Free
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-indigo-600 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Go to Dashboard
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-2.5 text-gray-400 text-sm font-medium mt-1">
              <div className="flex">
                {avatarColors.map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${color} border-2 border-white shadow-sm ${i > 0 ? "-ml-2" : ""}`}
                  />
                ))}
              </div>
              <span>Trusted by 500+ creative agencies worldwide</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10 w-full max-w-2xl">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium text-gray-400 text-center">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────── */}
        <section id="features" className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-semibold mb-4">
                ✦ Features
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                Everything You Need
              </h2>
              <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
                Powerful features designed to help creative agencies deliver exceptional work faster.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition-all duration-250 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-2xl mb-4 transition-colors duration-200">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENEFITS ──────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-xs font-semibold mb-4">
                ✦ Why CreativeOS
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                Built by Creatives,{" "}
                <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                  for Creatives
                </span>
              </h2>
              <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
                Experience the difference of a platform designed from the ground up for creative agencies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{benefit.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-semibold mb-4">
                ✦ Simple Process
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                Get Started in 3 Steps
              </h2>
              <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
                Up and running in minutes, not days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-250"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-500/30 mb-5">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-12 text-center text-white shadow-2xl shadow-indigo-500/30">

              {/* Decorative blobs inside CTA */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

              <h2 className="relative text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Ready to Transform Your Agency?
              </h2>
              <p className="relative text-indigo-100 text-lg leading-relaxed max-w-lg mx-auto mb-8">
                Join hundreds of creative agencies already using CreativeOS to streamline their
                workflow and deliver better results.
              </p>
              <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin/sign-up"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-indigo-600 bg-white hover:bg-indigo-50 shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started Free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/40 transition-all duration-200"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white px-6 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/25">
                  C
                </div>
                <span className="font-bold text-base tracking-tight text-gray-900">
                  Creative<span className="text-indigo-600">OS</span>
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-[200px]">
                The all-in-one platform for creative agency management.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group}>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">
                  {group}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-gray-400">
              © 2026 VUI CreativeOS. All rights reserved.
            </p>
            <div className="flex gap-1.5">
              {["bg-indigo-500", "bg-violet-500", "bg-purple-400"].map((color, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${color}`} />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
