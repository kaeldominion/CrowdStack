"use client";

/**
 * DESIGN SYSTEM - FORMS
 * 
 * Inputs, selects, textareas, checkboxes.
 * Route: /design-playground/forms
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 */

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, Button, Input } from "@crowdstack/ui";
import { 
  ArrowLeft, 
  Search, 
  Mail, 
  Lock, 
  User,
  Calendar,
  Eye,
  EyeOff,
  Check,
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

export default function FormsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [selectedOption, setSelectedOption] = useState("option1");

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
                  Forms
                </h1>
                <p className="text-sm text-secondary">Input components and form patterns</p>
              </div>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* INPUT COMPONENT */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Input Component" 
            subtitle="Text inputs from @crowdstack/ui"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Input */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Basic Input
              </p>
              <Input 
                placeholder="Enter your name..."
              />
              <div className="mt-4">
                <CodeBlock>{'<Input placeholder="..." />'}</CodeBlock>
              </div>
            </Card>

            {/* With Label */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Label
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Email Address
                </label>
                <Input 
                  type="email"
                  placeholder="you@example.com"
                />
              </div>
            </Card>

            {/* With Icon */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Icon (Custom)
              </p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full rounded-xl bg-raised border border-border-subtle pl-11 pr-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors"
                />
              </div>
            </Card>

            {/* Password Input */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Password Toggle
              </p>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  defaultValue="secretpassword"
                  className="w-full rounded-xl bg-raised border border-border-subtle pl-11 pr-12 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Card>

            {/* Disabled */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Disabled State
              </p>
              <Input 
                placeholder="Cannot edit..."
                disabled
                value="Disabled input"
              />
            </Card>

            {/* Error State */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Error State
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Invalid email"
                  defaultValue="invalid-email"
                  className="w-full rounded-xl bg-raised border border-accent-error px-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-error/50 transition-colors"
                />
                <p className="text-xs text-accent-error">Please enter a valid email address</p>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* TEXTAREA */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Textarea" 
            subtitle="Multi-line text input"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Default Textarea
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your event..."
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors resize-none"
                />
              </div>
            </Card>

            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Character Count
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Bio
                </label>
                <textarea
                  rows={4}
                  placeholder="Write a short bio..."
                  maxLength={160}
                  defaultValue="Event organizer and music enthusiast based in Dubai."
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors resize-none"
                />
                <p className="text-xs text-muted text-right">52/160</p>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* SELECT */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Select" 
            subtitle="Dropdown selection inputs"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Native Select
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Event Type
                </label>
                <select
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                >
                  <option value="">Select type...</option>
                  <option value="club">Club Night</option>
                  <option value="concert">Concert</option>
                  <option value="festival">Festival</option>
                  <option value="private">Private Event</option>
                </select>
              </div>
            </Card>

            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                With Default Value
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Timezone
                </label>
                <select
                  defaultValue="dubai"
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                >
                  <option value="dubai">Dubai (GMT+4)</option>
                  <option value="london">London (GMT+0)</option>
                  <option value="new_york">New York (GMT-5)</option>
                  <option value="tokyo">Tokyo (GMT+9)</option>
                </select>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* CHECKBOX & RADIO */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Checkbox & Radio" 
            subtitle="Selection controls"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Custom Checkbox */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Custom Checkbox
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => setCheckboxChecked(!checkboxChecked)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      checkboxChecked 
                        ? 'bg-accent-primary border-accent-primary' 
                        : 'border-border-strong group-hover:border-accent-primary/50'
                    }`}
                  >
                    {checkboxChecked && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span className="text-sm text-primary">I agree to the terms and conditions</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-5 h-5 rounded-md border-2 border-border-strong bg-raised flex items-center justify-center">
                    <Check className="h-3 w-3 text-accent-primary" />
                  </div>
                  <span className="text-sm text-primary">Receive email notifications</span>
                </label>

                <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
                  <div className="w-5 h-5 rounded-md border-2 border-border-subtle bg-raised" />
                  <span className="text-sm text-muted">Disabled option</span>
                </label>
              </div>
            </Card>

            {/* Radio Buttons */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Radio Buttons
              </p>
              <div className="space-y-3">
                {["option1", "option2", "option3"].map((option, i) => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => setSelectedOption(option)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedOption === option 
                          ? 'border-accent-primary' 
                          : 'border-border-strong group-hover:border-accent-primary/50'
                      }`}
                    >
                      {selectedOption === option && (
                        <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
                      )}
                    </button>
                    <span className="text-sm text-primary">Option {i + 1}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Toggle Switch */}
            <Card padding="compact">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Toggle Switch
              </p>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-primary">Enable notifications</span>
                  <button
                    type="button"
                    className="w-11 h-6 bg-accent-primary rounded-full relative transition-colors"
                  >
                    <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-primary">Dark mode</span>
                  <button
                    type="button"
                    className="w-11 h-6 bg-raised border border-border-subtle rounded-full relative transition-colors"
                  >
                    <span className="absolute left-1 top-1 w-4 h-4 bg-muted rounded-full transition-transform" />
                  </button>
                </label>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* FORM EXAMPLE */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Form Example" 
            subtitle="Complete form layout pattern"
          />
          
          <Card>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">
                    First Name
                  </label>
                  <Input placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">
                    Last Name
                  </label>
                  <Input placeholder="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full rounded-xl bg-raised border border-border-subtle pl-11 pr-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Your message..."
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCheckboxChecked(!checkboxChecked)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    checkboxChecked 
                      ? 'bg-accent-primary border-accent-primary' 
                      : 'border-border-strong'
                  }`}
                >
                  {checkboxChecked && <Check className="h-3 w-3 text-white" />}
                </button>
                <span className="text-sm text-secondary">
                  I agree to the <a href="#" className="text-accent-primary hover:underline">terms of service</a> and <a href="#" className="text-accent-primary hover:underline">privacy policy</a>
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="primary" type="submit">Submit</Button>
                <Button variant="ghost" type="button">Cancel</Button>
              </div>
            </form>
          </Card>
        </section>

      </div>
    </div>
  );
}

