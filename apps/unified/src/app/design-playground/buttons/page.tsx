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
                <Button variant="danger">Danger</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CodeBlock>variant="primary"</CodeBlock>
                <CodeBlock>variant="secondary"</CodeBlock>
                <CodeBlock>variant="ghost"</CodeBlock>
                <CodeBlock>variant="danger"</CodeBlock>
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
                <Button variant="primary" fullWidth>Join Guestlist</Button>
                <Button variant="secondary" fullWidth>View Details</Button>
              </div>
              <div className="mt-4">
                <CodeBlock>fullWidth</CodeBlock>
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

