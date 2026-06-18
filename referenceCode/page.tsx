// app/page.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileCheck,
  CalendarDays,
  Upload,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Logo from '@/public/creativeos-logo.jpeg';

const features = [
  {
    icon: Users,
    title: 'Client Onboarding',
    description:
      'Seamlessly onboard new clients with structured forms, document uploads, and automated workflows.',
  },
  {
    icon: FolderKanban,
    title: 'Project Management',
    description:
      'Track projects with Gantt charts, timelines, and real-time status updates across your entire team.',
  },
  {
    icon: CheckSquare,
    title: 'Task Board',
    description:
      'Organize deliverables, assign team members, and manage feedback loops in one centralized hub.',
  },
  {
    icon: FileCheck,
    title: 'Approval Workflows',
    description:
      'Streamline internal and client approvals with automated notifications and version control.',
  },
  {
    icon: CalendarDays,
    title: 'Content Calendar',
    description:
      'Visualize your entire content pipeline with a beautiful calendar view and drag-drop scheduling.',
  },
  {
    icon: Upload,
    title: 'Creative Upload',
    description:
      'Upload and manage creative assets with media preview, feedback, and client review capabilities.',
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Reporting',
    description:
      'Track team productivity, approval rates, and turnaround times with comprehensive analytics.',
  },
  {
    icon: LayoutDashboard,
    title: 'Unified Dashboard',
    description:
      'Get a bird\'s-eye view of active clients, open tasks, pending approvals, and project status.',
  },
];

const benefits = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed with optimized performance and instant updates.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with role-based access control.',
  },
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Automate workflows and reduce manual work by up to 70%.',
  },
];

const stats = [
  { value: '10x', label: 'Faster Approvals' },
  { value: '70%', label: 'Time Saved' },
  { value: '99%', label: 'Client Satisfaction' },
  { value: '24/7', label: 'Support' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                  src={Logo}
                  alt="Logo"
                  width={100}
                  height={100}
                  priority
                  className='h-20 w-auto'
                />
            </Link>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-white hover:text-[#0e563d] bg-primary rounded-lg hover:bg-primary/80 transition-colors shadow-sm"
              >
                Sign In
              </Link>
              {/* <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary transition-colors shadow-sm"
              >
                Sign Up
              </Link> */}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Creative Agency
              <br />
              <span className="text-primary">Management Simplified</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Streamline your creative workflow with an all-in-one platform for
              client onboarding, project management, approvals, and team
              collaboration.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-primary rounded-lg hover:bg-primary/80 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help creative agencies deliver
              exceptional work faster.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CreativeOS?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built by creatives, for creatives. Experience the difference.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple 3-Step Process
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in minutes, not days
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-white rounded-lg p-8 border border-gray-200 h-full">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Onboard Your Clients
                </h3>
                <p className="text-gray-600">
                  Create client profiles, upload brand guidelines, and set up
                  project requirements in minutes.
                </p>
              </div>
              {/* Connector */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300"></div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-lg p-8 border border-gray-200 h-full">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Manage & Create
                </h3>
                <p className="text-gray-600">
                  Assign tasks, track progress with Gantt charts, and manage
                  deliverables across your team.
                </p>
              </div>
              {/* Connector */}
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-300"></div>
            </div>

            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Deliver & Approve
              </h3>
              <p className="text-gray-600">
                Streamline approvals, collect feedback, and publish content
                with automated workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-linear-to-br from-primary to-primary rounded-2xl p-8 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Agency?
            </h2>
            <p className="text-lg text-white mb-8 max-w-2xl mx-auto">
              Join CreativeOS to streamline your workflow and deliver better results.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-primary bg-white rounded-lg hover:bg-gray-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-gray-900 py-6 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Image src={Logo} alt="Logo" width={100} height={100} className='h-18 w-auto' />
              </div>
              <p className="text-sm text-gray-500">
                The all-in-one platform for creative agency management.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-black mb-4">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-gray-600 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-black mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-black mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-600 transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 text-sm text-center">
            <p>
              © 2026 VUI CreativeOS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}