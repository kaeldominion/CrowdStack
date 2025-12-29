"use client";

/**
 * DESIGN SYSTEM - BUTTONS
 * 
 * Button variants, sizes, states, and icons.
 * Route: /design-playground/buttons
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 */

import Link from "next/link";
import { Card, Badge, Button } from "@crowdstack/ui";
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  X, 
  Share2, 
  Heart, 
  Download,
  ChevronRight,
  Loader2,
  Ticket,
  QrCode,
  ExternalLink,
  Eye,
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

export default function ButtonsPage() {
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
                  Buttons
                </h1>
                <p className="text-sm text-secondary">Button variants and states</p>
              </div>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* BUTTON COMPONENT */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Button Component" 
            subtitle="Primary Button component from @crowdstack/ui"
          />
          
          <div className="space-y-8">
            {/* Variants */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Variants
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>variant="primary"</CodeBlock>
                <CodeBlock>variant="secondary"</CodeBlock>
                <CodeBlock>variant="ghost"</CodeBlock>
                <CodeBlock>variant="destructive"</CodeBlock>
              </div>
            </Card>

            {/* Sizes */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>size="sm"</CodeBlock>
                <CodeBlock>size="md"</CodeBlock>
                <CodeBlock>size="lg"</CodeBlock>
              </div>
            </Card>

            {/* With Icons */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Icons
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
                <Button variant="secondary">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="ghost">
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>
                <Button variant="primary">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>

            {/* States */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                States
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Default</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="primary" className="opacity-75 cursor-wait">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading
                </Button>
              </div>
              <div className="mt-4">
                <CodeBlock>disabled</CodeBlock>
              </div>
            </Card>

            {/* Full Width */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Full Width
              </p>
              <div className="space-y-3 max-w-sm">
                <Button variant="primary" className="w-full">Join Guestlist</Button>
                <Button variant="secondary" className="w-full">View Details</Button>
              </div>
              <div className="mt-4">
                <CodeBlock>className="w-full"</CodeBlock>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* REGISTRATION TYPE BUTTONS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Registration Type CTAs" 
            subtitle="Different button states based on event registration type"
          />
          
          <div className="space-y-6">
            {/* Guestlist - Default */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Guestlist (Default)
              </p>
              <p className="text-sm text-muted mb-4">Standard CrowdStack registration - users join the guestlist</p>
              <div className="space-y-3 max-w-sm">
                {/* Open state */}
                <Button variant="primary" size="lg" className="w-full font-mono uppercase tracking-wider">
                  <Ticket className="h-4 w-4 mr-2" />
                  Join Guestlist
                </Button>
                {/* Registered state */}
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="w-full font-mono uppercase tracking-wider bg-accent-success/20 border-accent-success/50 text-accent-success"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  View Entry Pass
                </Button>
                {/* Closed state */}
                <Button 
                  variant="secondary" 
                  size="lg" 
                  disabled
                  className="w-full font-mono uppercase tracking-wider opacity-60"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Guestlist Closed
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>registration_type="guestlist"</CodeBlock>
              </div>
            </Card>

            {/* External Link */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                External Tickets
              </p>
              <p className="text-sm text-muted mb-4">Links to external ticketing (RA, Eventbrite, etc.)</p>
              <div className="space-y-3 max-w-sm">
                {/* Active state */}
                <Button variant="primary" size="lg" className="w-full font-mono uppercase tracking-wider">
                  <Ticket className="h-4 w-4 mr-2" />
                  Get Tickets
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                {/* Badge example */}
                <div className="flex items-center gap-2">
                  <Badge color="blue" variant="solid" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    External
                  </Badge>
                  <span className="text-xs text-muted">Shows in event cards</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>registration_type="external_link"</CodeBlock>
              </div>
            </Card>

            {/* Display Only */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Display Only
              </p>
              <p className="text-sm text-muted mb-4">Event info only - no registration or ticketing</p>
              <div className="space-y-3 max-w-sm">
                {/* Info message */}
                <div className="py-3 px-4 rounded-xl bg-raised/50 border border-border-subtle text-center">
                  <p className="text-sm text-muted">
                    <Eye className="h-4 w-4 inline mr-2" />
                    Event info only – no registration
                  </p>
                </div>
                {/* Badge example */}
                <div className="flex items-center gap-2">
                  <Badge color="slate" variant="solid" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    Info
                  </Badge>
                  <span className="text-xs text-muted">Shows in event cards</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>registration_type="display_only"</CodeBlock>
              </div>
            </Card>

            {/* Mobile CTA Variants */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Mobile Sticky CTA Variants
              </p>
              <p className="text-sm text-muted mb-4">How the mobile bottom bar changes per registration type</p>
              <div className="space-y-4 max-w-md">
                {/* Guestlist */}
                <div className="flex items-center gap-2 p-3 bg-void rounded-xl border border-border-subtle">
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-muted uppercase">Guestlist:</span>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-3 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-accent-secondary to-accent-primary border-accent-primary/50 text-void shadow-lg">
                    <Ticket className="h-4 w-4" />
                    Register Now
                  </div>
                </div>
                {/* External */}
                <div className="flex items-center gap-2 p-3 bg-void rounded-xl border border-border-subtle">
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-muted uppercase">External:</span>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-3 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-500 border-blue-500/50 text-white shadow-lg">
                    <Ticket className="h-4 w-4" />
                    Get Tickets
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
                {/* Display only - no CTA */}
                <div className="flex items-center gap-2 p-3 bg-void rounded-xl border border-border-subtle">
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-muted uppercase">Display Only:</span>
                  </div>
                  <span className="text-xs text-muted italic">No CTA button (share only)</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* CUSTOM BUTTON STYLES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Custom Button Patterns" 
            subtitle="Common button patterns used throughout the app"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action Buttons */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Event Card Actions
              </p>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 bg-accent-success text-void font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-md hover:bg-accent-success/90 transition-colors">
                  <Check className="h-3 w-3" />
                  View Entry
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-md bg-accent-error/20 border border-accent-error/40 hover:bg-accent-error/30 transition-colors">
                  <X className="h-3.5 w-3.5 text-accent-error" />
                </button>
              </div>
            </Card>

            {/* Ghost Button */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Glass Button
              </p>
              <button className="w-full py-3 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors">
                See More Past Events
              </button>
            </Card>

            {/* Icon Button */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Icon-Only Buttons
              </p>
              <div className="flex gap-3">
                <button className="w-10 h-10 rounded-full bg-glass/80 border border-border-subtle flex items-center justify-center hover:bg-active transition-colors">
                  <Share2 className="h-4 w-4 text-primary" />
                </button>
                <button className="w-10 h-10 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center hover:bg-accent-primary/30 transition-colors">
                  <Heart className="h-4 w-4 text-accent-primary" />
                </button>
                <button className="w-10 h-10 rounded-xl bg-raised border border-border-subtle flex items-center justify-center hover:border-accent-primary/30 transition-colors">
                  <Download className="h-4 w-4 text-secondary" />
                </button>
              </div>
            </Card>

            {/* Pill Button */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Pill/Tag Buttons
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-full bg-accent-secondary text-void text-[10px] font-bold uppercase tracking-widest hover:bg-accent-secondary/90 transition-colors">
                  Active
                </button>
                <button className="px-3 py-1.5 rounded-full bg-glass border border-border-subtle text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-primary hover:border-accent-primary/30 transition-colors">
                  Inactive
                </button>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* BADGE COMPONENT */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Badge Component" 
            subtitle="Status badges and labels"
          />
          
          <div className="space-y-6">
            {/* Colors */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Colors (Solid)
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge color="purple" variant="solid">Purple</Badge>
                <Badge color="blue" variant="solid">Blue</Badge>
                <Badge color="green" variant="solid">Green</Badge>
                <Badge color="red" variant="solid">Red</Badge>
                <Badge color="orange" variant="solid">Orange</Badge>
                <Badge color="slate" variant="solid">Slate</Badge>
              </div>
            </Card>

            {/* Outline Variant */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Colors (Outline)
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge color="purple" variant="outline">Purple</Badge>
                <Badge color="blue" variant="outline">Blue</Badge>
                <Badge color="green" variant="outline">Green</Badge>
                <Badge color="red" variant="outline">Red</Badge>
                <Badge color="orange" variant="outline">Orange</Badge>
                <Badge color="slate" variant="outline">Slate</Badge>
              </div>
            </Card>

            {/* Ghost Variant */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Colors (Ghost)
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge color="purple" variant="ghost">Purple</Badge>
                <Badge color="blue" variant="ghost">Blue</Badge>
                <Badge color="green" variant="ghost">Green</Badge>
                <Badge color="red" variant="ghost">Red</Badge>
                <Badge color="slate" variant="ghost">Slate</Badge>
              </div>
            </Card>

            {/* Use Cases */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Common Use Cases
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge color="green" variant="solid">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  LIVE
                </Badge>
                <Badge color="green" variant="solid">ATTENDING</Badge>
                <Badge color="purple" variant="solid">VIP ACCESS</Badge>
                <Badge color="slate" variant="ghost">Approval Req.</Badge>
                <Badge color="orange" variant="solid">Pending</Badge>
                <Badge color="red" variant="solid">Rejected</Badge>
              </div>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}

