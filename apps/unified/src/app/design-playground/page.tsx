"use client";

/**
 * DESIGN SYSTEM INDEX
 * 
 * Internal design playground - Storybook-lite for CrowdStack.
 * Route: /design-playground
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 */

import Link from "next/link";
import { Card, Badge } from "@crowdstack/ui";
import { 
  Type, 
  MousePointer, 
  FormInput, 
  LayoutGrid,
  Palette,
  Component,
  ArrowRight,
} from "lucide-react";

const DESIGN_PAGES = [
  {
    title: "Cards",
    description: "VenueCard, EventCard, and row variants",
    href: "/design-playground/cards",
    icon: LayoutGrid,
    status: "ready",
  },
  {
    title: "Dashboard Cards",
    description: "Event cards for organizer/venue/promoter dashboards with stats",
    href: "/design-playground/dashboard-cards",
    icon: LayoutGrid,
    status: "ready",
  },
  {
    title: "Dashboard Components",
    description: "Stat cards, navigation, leaderboards, charts, and metrics",
    href: "/design-playground/dashboard-components",
    icon: LayoutGrid,
    status: "ready",
  },
  {
    title: "Typography",
    description: "Type scale, meta labels, headings, body text",
    href: "/design-playground/typography",
    icon: Type,
    status: "ready",
  },
  {
    title: "Buttons",
    description: "Button variants, sizes, states, and icons",
    href: "/design-playground/buttons",
    icon: MousePointer,
    status: "ready",
  },
  {
    title: "Forms",
    description: "Inputs, selects, textareas, checkboxes",
    href: "/design-playground/forms",
    icon: FormInput,
    status: "ready",
  },
  {
    title: "Navigation",
    description: "Tabs, pills, menus, and navigation patterns",
    href: "/design-playground/navigation",
    icon: Component,
    status: "ready",
  },
  {
    title: "Colors & Tokens",
    description: "Design tokens, color palette, spacing",
    href: "/design-playground/tokens",
    icon: Palette,
    status: "planned",
  },
];

export default function DesignPlaygroundIndex() {
  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Badge color="purple" variant="solid">INTERNAL</Badge>
            <Badge color="slate" variant="outline">DEV ONLY</Badge>
          </div>
          <h1 className="font-sans text-4xl font-black text-primary uppercase tracking-tighter mb-3">
            Design System
          </h1>
          <p className="text-lg text-secondary max-w-2xl">
            CrowdStack component library and design tokens. Use this playground to preview and tune UI components globally.
          </p>
        </div>
      </div>

      {/* Navigation Grid */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESIGN_PAGES.map((page) => {
            const Icon = page.icon;
            const isPlanned = page.status === "planned";
            
            return (
              <Link 
                key={page.href} 
                href={isPlanned ? "#" : page.href}
                className={isPlanned ? "cursor-not-allowed" : ""}
              >
                <Card 
                  hover={!isPlanned}
                  className={`h-full ${isPlanned ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-accent-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-sans text-lg font-bold text-primary">
                          {page.title}
                        </h3>
                        {isPlanned && (
                          <Badge color="slate" variant="ghost" className="!text-[9px]">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-secondary line-clamp-2">
                        {page.description}
                      </p>
                    </div>
                    {!isPlanned && (
                      <ArrowRight className="h-5 w-5 text-muted flex-shrink-0" />
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Reference */}
        <div className="mt-16">
          <h2 className="font-sans text-xl font-bold text-primary mb-6">Quick Reference</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Locations */}
            <Card padding="compact">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Source Files
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Tokens</span>
                  <span className="text-secondary">/styles/tokens.css</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Globals</span>
                  <span className="text-secondary">/app/globals.css</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">UI Package</span>
                  <span className="text-secondary">/packages/ui/src</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Tailwind</span>
                  <span className="text-secondary">/tailwind.config.ts</span>
                </div>
              </div>
            </Card>

            {/* Key Classes */}
            <Card padding="compact">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Key Utilities
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Backgrounds</span>
                  <span className="text-secondary">bg-void/glass/raised/active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Text</span>
                  <span className="text-secondary">text-primary/secondary/muted</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Borders</span>
                  <span className="text-secondary">border-border-subtle/strong</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Accents</span>
                  <span className="text-secondary">accent-primary/secondary/success/error</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

