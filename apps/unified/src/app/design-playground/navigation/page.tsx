"use client";

/**
 * DESIGN SYSTEM - NAVIGATION
 * 
 * Tabs, pills, menus, and navigation patterns.
 * Route: /design-playground/navigation
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 */

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@crowdstack/ui";
import { 
  ArrowLeft, 
  Home,
  Calendar,
  User,
  Settings,
  ChevronDown,
  ChevronRight,
  Compass,
  Layers,
  Building2,
  Users,
  Megaphone,
  Shield,
} from "lucide-react";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-sans text-2xl font-black text-primary uppercase tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="font-mono text-[10px] bg-raised px-2 py-1 rounded text-accent-secondary">
      {children}
    </code>
  );
}

export default function NavigationPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [activePill, setActivePill] = useState("me");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-void/95 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/design-playground" 
                className="text-muted hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-sans text-2xl font-black text-primary uppercase tracking-tighter">
                  Navigation
                </h1>
                <p className="text-sm text-secondary">Tabs, pills, and menu patterns</p>
              </div>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* TAB NAVIGATION */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Tab Navigation" 
            subtitle="Underlined tabs using global tab-label classes"
          />
          
          <div className="space-y-8">
            {/* Standard Tabs */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Standard Tabs
              </p>
              <nav className="flex gap-6 border-b border-border-subtle">
                {["upcoming", "past", "photos"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`tab-label ${activeTab === tab ? "tab-label-active" : "tab-label-inactive"}`}
                  >
                    {tab === "upcoming" ? "Upcoming Events" : tab === "past" ? "Past Events" : "Photos"}
                  </button>
                ))}
              </nav>
              <div className="mt-4 p-4 bg-raised rounded-xl">
                <p className="text-sm text-secondary">
                  Active tab: <span className="text-primary font-medium">{activeTab}</span>
                </p>
              </div>
              <div className="mt-4">
                <CodeBlock>tab-label tab-label-active / tab-label-inactive</CodeBlock>
              </div>
            </Card>

            {/* Disabled Tab */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Disabled Tab
              </p>
              <nav className="flex gap-6 border-b border-border-subtle">
                <button className="tab-label tab-label-active">Events</button>
                <button className="tab-label tab-label-inactive">DJs</button>
                <button className="tab-label tab-label-inactive opacity-50 cursor-not-allowed" disabled>
                  Coming Soon
                </button>
              </nav>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* PILL NAVIGATION */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Pill Navigation" 
            subtitle="Floating pill-style navigation (DockNav)"
          />
          
          <div className="space-y-8">
            {/* Main Pill Nav */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Main Pill Navigation
              </p>
              <div className="flex justify-center">
                <nav className="flex items-center bg-void/90 backdrop-blur-xl border border-border-strong rounded-full py-2 px-3 shadow-2xl">
                  {/* Logo */}
                  <div className="flex items-center gap-2 pr-3 border-r border-border-strong">
                    <div className="w-7 h-7 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full" />
                    <span className="hidden sm:block font-black tracking-tighter text-xs text-primary">
                      CROWDSTACK<span className="text-accent-primary">.</span>
                    </span>
                  </div>

                  {/* Nav Items */}
                  <div className="flex items-center gap-0.5 px-2">
                    {[
                      { id: "me", label: "Me", icon: User },
                      { id: "browse", label: "Browse", icon: Compass },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActivePill(item.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                            activePill === item.id
                              ? "bg-accent-secondary text-void shadow-lg"
                              : "text-secondary hover:text-white hover:bg-active/50"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}

                    {/* Mode Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Mode</span>
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {dropdownOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-glass border border-border-strong rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50">
                          {[
                            { label: "Venue", icon: Building2, href: "#" },
                            { label: "Organizer", icon: Users, href: "#" },
                            { label: "Promoter", icon: Megaphone, href: "#" },
                            { label: "Admin", icon: Shield, href: "#" },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div className="pl-3 border-l border-border-strong">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary" />
                  </div>
                </nav>
              </div>
              <div className="mt-6 text-center">
                <CodeBlock>bg-void/90 backdrop-blur-xl rounded-full</CodeBlock>
              </div>
            </Card>

            {/* Logged Out Pill */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Logged Out State
              </p>
              <div className="flex justify-center">
                <nav className="flex items-center bg-void/90 backdrop-blur-xl border border-border-strong rounded-full py-2 px-3 shadow-2xl">
                  {/* Logo */}
                  <div className="flex items-center gap-2 pr-3 border-r border-border-strong">
                    <div className="w-7 h-7 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full" />
                    <span className="font-black tracking-tighter text-xs text-primary">
                      CROWDSTACK<span className="text-accent-primary">.</span>
                    </span>
                  </div>

                  {/* Browse */}
                  <div className="flex items-center gap-0.5 px-2">
                    <button className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-white hover:bg-active/50 transition-all">
                      Browse
                    </button>
                  </div>

                  {/* Login Button */}
                  <div className="pl-2">
                    <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-bold text-[10px] uppercase tracking-widest shadow-lg hover:shadow-xl transition-shadow">
                      Login
                    </button>
                  </div>
                </nav>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* SIDEBAR NAVIGATION */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Sidebar Navigation" 
            subtitle="Vertical navigation for dashboards"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="none">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary p-4 border-b border-border-subtle">
                Dashboard Sidebar
              </p>
              <nav className="p-2">
                {[
                  { label: "Dashboard", icon: Home, active: true },
                  { label: "Events", icon: Calendar, active: false },
                  { label: "Profile", icon: User, active: false },
                  { label: "Settings", icon: Settings, active: false },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        item.active
                          ? "bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
                          : "text-secondary hover:text-primary hover:bg-active"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                      {item.active && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </Card>

            <Card padding="none">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary p-4 border-b border-border-subtle">
                Compact Sidebar
              </p>
              <nav className="p-2 space-y-1">
                {[
                  { label: "Events", icon: Calendar, count: 12 },
                  { label: "Registrations", icon: Users, count: 156 },
                  { label: "Settings", icon: Settings, count: null },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.count !== null && (
                        <span className="text-xs font-mono text-muted">{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* BREADCRUMBS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Breadcrumbs" 
            subtitle="Navigation path indicators"
          />
          
          <Card padding="compact">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
              Breadcrumb Trail
            </p>
            <nav className="flex items-center gap-2 text-sm">
              <a href="#" className="text-secondary hover:text-primary transition-colors">
                Home
              </a>
              <ChevronRight className="h-4 w-4 text-muted" />
              <a href="#" className="text-secondary hover:text-primary transition-colors">
                Venues
              </a>
              <ChevronRight className="h-4 w-4 text-muted" />
              <span className="text-primary font-medium">Jade by Todd English</span>
            </nav>
          </Card>
        </section>

        {/* ============================================ */}
        {/* PAGINATION */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Pagination" 
            subtitle="Page navigation controls"
          />
          
          <Card padding="compact">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
              Page Numbers
            </p>
            <div className="flex items-center gap-1">
              <button className="px-3 py-2 rounded-lg text-sm text-muted hover:text-primary hover:bg-active transition-colors">
                Previous
              </button>
              <button className="w-10 h-10 rounded-lg text-sm bg-accent-primary text-white font-medium">
                1
              </button>
              <button className="w-10 h-10 rounded-lg text-sm text-secondary hover:text-primary hover:bg-active transition-colors">
                2
              </button>
              <button className="w-10 h-10 rounded-lg text-sm text-secondary hover:text-primary hover:bg-active transition-colors">
                3
              </button>
              <span className="px-2 text-muted">...</span>
              <button className="w-10 h-10 rounded-lg text-sm text-secondary hover:text-primary hover:bg-active transition-colors">
                12
              </button>
              <button className="px-3 py-2 rounded-lg text-sm text-secondary hover:text-primary hover:bg-active transition-colors">
                Next
              </button>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}

