"use client";

/**
 * DESIGN SYSTEM - TYPOGRAPHY
 * 
 * Type scale, meta labels, headings, body text.
 * Route: /design-playground/typography
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 */

import Link from "next/link";
import { Card, Badge } from "@crowdstack/ui";
import { ArrowLeft } from "lucide-react";

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

export default function TypographyPage() {
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
                  Typography
                </h1>
                <p className="text-sm text-secondary">Type scale and text styles</p>
              </div>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* FONT FAMILIES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Font Families" 
            subtitle="Inter (sans) for UI, JetBrains Mono (mono) for labels and code"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                Sans (Inter)
              </p>
              <p className="font-sans text-3xl font-bold text-primary mb-2">
                The quick brown fox
              </p>
              <p className="font-sans text-base text-secondary">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>
                abcdefghijklmnopqrstuvwxyz<br/>
                0123456789
              </p>
              <div className="mt-4">
                <CodeBlock>font-sans / var(--font-sans)</CodeBlock>
              </div>
            </Card>

            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                Mono (JetBrains Mono)
              </p>
              <p className="font-mono text-3xl font-bold text-primary mb-2">
                The quick brown fox
              </p>
              <p className="font-mono text-base text-secondary">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>
                abcdefghijklmnopqrstuvwxyz<br/>
                0123456789
              </p>
              <div className="mt-4">
                <CodeBlock>font-mono / var(--font-mono)</CodeBlock>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* TYPE SCALE */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Type Scale" 
            subtitle="Heading sizes with recommended weights and tracking"
          />
          
          <Card padding="none">
            <div className="divide-y divide-border-subtle">
              {/* Page Title */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="page-title">Page Title</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">40px / 900</p>
                    <CodeBlock>page-title</CodeBlock>
                  </div>
                </div>
              </div>

              {/* H1 */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-sans text-4xl font-black text-primary uppercase tracking-tighter">
                      Heading One
                    </h1>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">36px / 900</p>
                    <CodeBlock>text-4xl font-black tracking-tighter</CodeBlock>
                  </div>
                </div>
              </div>

              {/* H2 */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-sans text-3xl font-bold text-primary tracking-tight">
                      Heading Two
                    </h2>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">30px / 700</p>
                    <CodeBlock>text-3xl font-bold tracking-tight</CodeBlock>
                  </div>
                </div>
              </div>

              {/* H3 */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-sans text-2xl font-bold text-primary">
                      Heading Three
                    </h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">24px / 700</p>
                    <CodeBlock>text-2xl font-bold</CodeBlock>
                  </div>
                </div>
              </div>

              {/* H4 */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-sans text-xl font-semibold text-primary">
                      Heading Four
                    </h4>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">20px / 600</p>
                    <CodeBlock>text-xl font-semibold</CodeBlock>
                  </div>
                </div>
              </div>

              {/* H5 */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-sans text-lg font-semibold text-primary">
                      Heading Five
                    </h5>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">18px / 600</p>
                    <CodeBlock>text-lg font-semibold</CodeBlock>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base text-primary">
                      Body text - Regular paragraph content
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">16px / 400</p>
                    <CodeBlock>text-base text-primary</CodeBlock>
                  </div>
                </div>
              </div>

              {/* Small */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-secondary">
                      Small text - Secondary information
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">14px / 400</p>
                    <CodeBlock>text-sm text-secondary</CodeBlock>
                  </div>
                </div>
              </div>

              {/* XS */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted">
                      Extra small - Captions and hints
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] text-muted">12px / 400</p>
                    <CodeBlock>text-xs text-muted</CodeBlock>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================ */}
        {/* SPECIAL STYLES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Special Styles" 
            subtitle="Meta labels, section headers, and tab labels"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Label */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Meta Label Style
              </p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                This is a meta label
              </p>
              <div className="mt-4">
                <CodeBlock>font-mono text-[10px] font-bold uppercase tracking-widest text-secondary</CodeBlock>
              </div>
            </Card>

            {/* Section Header */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Section Header Style
              </p>
              <p className="section-header">
                Section Header
              </p>
              <div className="mt-4">
                <CodeBlock>section-header (global class)</CodeBlock>
              </div>
            </Card>

            {/* Tab Labels */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Tab Label Styles
              </p>
              <div className="flex gap-4 border-b border-border-subtle pb-3">
                <span className="tab-label tab-label-active">Active Tab</span>
                <span className="tab-label tab-label-inactive">Inactive Tab</span>
              </div>
              <div className="mt-4">
                <CodeBlock>tab-label tab-label-active/inactive</CodeBlock>
              </div>
            </Card>

            {/* Accent Text */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Accent Colors
              </p>
              <div className="space-y-2">
                <p className="text-accent-primary font-medium">Primary accent text</p>
                <p className="text-accent-secondary font-medium">Secondary accent text</p>
                <p className="text-accent-success font-medium">Success accent text</p>
                <p className="text-accent-error font-medium">Error accent text</p>
              </div>
              <div className="mt-4">
                <CodeBlock>text-accent-primary/secondary/success/error</CodeBlock>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* RESPONSIVE EXAMPLES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Responsive Examples" 
            subtitle="How typography adapts at different breakpoints"
          />
          
          <Card>
            <div className="space-y-6">
              {/* Mobile Hero */}
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                  Mobile Hero (Default)
                </p>
                <div className="bg-raised rounded-xl p-6 max-w-sm">
                  <h1 className="font-sans text-2xl font-black text-primary uppercase tracking-tighter leading-none">
                    ALEXANDR V.
                  </h1>
                  <p className="font-mono text-xs text-secondary mt-1">
                    @alexandr • Dubai, UAE
                  </p>
                </div>
              </div>

              {/* Desktop Hero */}
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                  Desktop Hero (lg:)
                </p>
                <div className="bg-raised rounded-xl p-6">
                  <h1 className="font-sans text-4xl font-black text-primary uppercase tracking-tighter leading-none">
                    ALEXANDR V.
                  </h1>
                  <p className="font-mono text-sm text-secondary mt-2">
                    @alexandr • Dubai, UAE
                  </p>
                </div>
              </div>

              {/* Card Title */}
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                  Event Card Title
                </p>
                <div className="bg-raised rounded-xl p-4 max-w-xs">
                  <p className="font-mono text-sm font-medium text-accent-secondary tracking-wide mb-1">
                    SAT 28 DEC • 22:00
                  </p>
                  <h3 className="font-sans text-xl font-black text-primary uppercase tracking-tight leading-tight">
                    Friday Night Sessions
                  </h3>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================ */}
        {/* TEXT COLORS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Text Colors" 
            subtitle="Semantic color classes for text"
          />
          
          <Card padding="none">
            <div className="divide-y divide-border-subtle">
              <div className="p-6 flex items-center justify-between">
                <span className="text-primary text-lg font-medium">Primary Text</span>
                <CodeBlock>text-primary</CodeBlock>
              </div>
              <div className="p-6 flex items-center justify-between">
                <span className="text-secondary text-lg font-medium">Secondary Text</span>
                <CodeBlock>text-secondary</CodeBlock>
              </div>
              <div className="p-6 flex items-center justify-between">
                <span className="text-muted text-lg font-medium">Muted Text</span>
                <CodeBlock>text-muted</CodeBlock>
              </div>
              <div className="p-6 flex items-center justify-between bg-primary rounded-b-xl">
                <span className="text-void text-lg font-medium">Inverse (on light)</span>
                <code className="font-mono text-[10px] bg-void/20 px-2 py-1 rounded text-void">text-void</code>
              </div>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}

