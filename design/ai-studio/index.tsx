import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Layers, Palette, CheckCircle2, Copy, Type, MapPin, Search, 
  Globe, Phone, Star, Building2, Loader2, AlertTriangle, 
  Trash2, Edit2, Plus, Upload, Layout, Terminal,
  ArrowRight, ArrowUpCircle, ExternalLink,
  Play, Wand2, Sparkles, Zap,
  BarChart3, Users, Activity, Bell, Settings, Calendar,
  ChevronRight, MoreVertical, Shield, Filter,
  Ticket, Mic2, Heart, Share2, MoreHorizontal, User,
  Check, ChevronDown, ToggleLeft, ToggleRight, Sliders, 
  QrCode, Scan, Smartphone, CheckSquare, X, LogOut, CreditCard,
  Map, Music, Code2, Cpu, Box
} from 'lucide-react';

// --- Constants & System Prompts ---

const CROWDSTACK_SYSTEM_PROMPT = `
// CROWDSTACK NEURAL DESIGN SYSTEM V4.3 (THE BIBLE)
// STRICT ADHERENCE REQUIRED FOR ALL UI GENERATION

/**
 * BRAND PHILOSOPHY: "The Blueprint of the Night"
 * Context: Event Registration, Live Operations, Data Visualization.
 * Aesthetic: Cyber-Industrial, Technical, Precision, Dark, Glowing.
 * Metaphor: The interface should feel like a HUD (Heads Up Display).
 */

// --- 1. CORE FOUNDATIONS ---

const COLORS = {
  background: {
    void: "#050505",    // Main App Background (The Void)
    glass: "#0A0A0A",   // Card Background (Always use with border-white/5)
    raised: "#111111",  // Dropdowns / Modals
    active: "#1A1A1A",  // Hover states
  },
  accent: {
    primary: "#A855F7",   // Neural Purple (Action, Creation, Magic)
    secondary: "#3B82F6", // Digital Blue (Data, Information, Neutral)
    success: "#10B981",   // Signal Green (Check-in, Approved, Growth)
    warning: "#F59E0B",   // Alert Amber (Pending, Waitlist)
    error: "#EF4444",     // Critical Red (Destructive, Cancelled, Banned)
  },
  text: {
    primary: "#E2E8F0",   // Slate 200 (Headings, Body)
    secondary: "#94A3B8", // Slate 400 (Subtitles, Descriptions)
    muted: "#475569",     // Slate 600 (Placeholders, Icons)
    inverse: "#000000"    // Text on white/bright backgrounds
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.05)",
    strong: "rgba(255, 255, 255, 0.1)",
    highlight: "rgba(168, 85, 247, 0.3)",
  }
};

// --- 2. TYPOGRAPHY SYSTEM ---

// FONT FAMILIES
// Primary: "Inter", sans-serif (UI, Body, Headings)
// Technical: "JetBrains Mono", monospace (Data, Labels, IDs, Timestamps)

const TYPOGRAPHY = {
  h1: "font-sans font-black text-4xl to-6xl tracking-tighter uppercase text-white",
  h2: "font-sans font-extrabold text-2xl to-3xl tracking-tight text-white",
  h3: "font-sans font-bold text-lg to-xl tracking-normal text-white",
  body: "font-sans font-medium text-sm text-slate-300 leading-relaxed",
  
  // THE "CROWDSTACK SIGNATURE" STYLES
  label: "font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500",
  value: "font-mono text-xs text-purple-400",
  stat: "font-mono text-3xl font-light tracking-tighter text-white",
  code: "font-mono text-[10px] text-slate-600",
};

// --- 3. COMPONENT LIBRARY (ATOMS) ---

// NAVIGATION (iOS Pill Style)
// Structure: Floating Dock (Top or Bottom).
// Style: Full rounded capsule, glassmorphism, border-white/10.
// Components: Logo (Left), Links (Center), Profile (Right).

// BUTTONS
// Shape: Rounded-xl (Primary), Rounded-lg (Secondary)
// Primary: bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold tracking-widest text-xs uppercase
// Secondary: bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-mono text-xs
// Ghost: text-slate-500 hover:text-white transition-colors

// BADGES / TAGS
// Shape: Rounded (4px)
// Style: text-[9px] font-bold uppercase tracking-wider border
// Variants:
// - Solid: bg-purple-600 text-white border-transparent
// - Outline: bg-purple-500/10 border-purple-500/30 text-purple-400
// - Ghost: bg-slate-800/50 text-slate-400 border-transparent

`.trim();

// --- Reusable UI Components ---

const CrowdStackLogo = ({ className, color = "white" }: { className?: string, color?: "white" | "purple" }) => {
    const stroke = color === 'purple' ? '#A855F7' : 'currentColor';
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 17L12 22L22 17" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const Badge = ({ children, color = "purple", variant = "outline" }: { children: React.ReactNode, color?: "purple" | "blue" | "slate" | "green" | "red" | "amber", variant?: "outline" | "solid" | "ghost" }) => {
  const colors = {
    purple: { outline: "bg-purple-500/10 border-purple-500/30 text-purple-400", solid: "bg-purple-600 border-purple-600 text-white", ghost: "bg-purple-500/5 border-transparent text-purple-300" },
    blue: { outline: "bg-blue-500/10 border-blue-500/30 text-blue-400", solid: "bg-blue-600 border-blue-600 text-white", ghost: "bg-blue-500/5 border-transparent text-blue-300" },
    slate: { outline: "bg-slate-500/10 border-slate-500/30 text-slate-400", solid: "bg-slate-600 border-slate-600 text-white", ghost: "bg-slate-500/5 border-transparent text-slate-400" },
    green: { outline: "bg-green-500/10 border-green-500/30 text-green-400", solid: "bg-green-600 border-green-600 text-white", ghost: "bg-green-500/5 border-transparent text-green-300" },
    red: { outline: "bg-red-500/10 border-red-500/30 text-red-400", solid: "bg-red-600 border-red-600 text-white", ghost: "bg-red-500/5 border-transparent text-red-300" },
    amber: { outline: "bg-amber-500/10 border-amber-500/30 text-amber-400", solid: "bg-amber-600 border-amber-600 text-black", ghost: "bg-amber-500/5 border-transparent text-amber-300" }
  };
  
  const selectedStyle = colors[color][variant];

  return (
    <span className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase border ${selectedStyle}`}>
      {children}
    </span>
  );
};

const DesignSpecBlock = ({ label, value, font = "font-sans" }: { label: string, value: string, font?: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-white/5">
    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
    <span className={`text-sm text-slate-200 ${font}`}>{value}</span>
  </div>
);

const ColorSwatch = ({ name, hex, usage }: { name: string, hex: string, usage: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button 
      onClick={() => {
        navigator.clipboard.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="group flex flex-col items-start text-left w-full"
    >
      <div className="w-full aspect-[2/1] rounded-xl mb-3 relative overflow-hidden border border-white/5 transition-transform group-hover:scale-[1.02]" style={{ backgroundColor: hex }}>
         <div className={`absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-xs font-mono font-bold text-white">COPIED</span>
         </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
         <div className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: hex }}></div>
         <span className="text-xs font-bold text-slate-200">{name}</span>
      </div>
      <span className="text-[10px] font-mono text-purple-400 uppercase">{hex}</span>
      <span className="text-[10px] text-slate-600 mt-0.5">{usage}</span>
    </button>
  )
};

const StatCard = ({ label, value, trend, trendDir }: { label: string, value: string, trend: string, trendDir: 'up' | 'down' | 'neutral' }) => (
    <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl relative overflow-hidden group hover:border-purple-500/20 transition-all">
        <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            <div className={`p-1.5 rounded-full ${trendDir === 'up' ? 'bg-green-500/10 text-green-500' : trendDir === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'}`}>
                {trendDir === 'up' ? <ArrowUpCircle className="w-4 h-4" /> : trendDir === 'down' ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            </div>
        </div>
        <div className="text-3xl font-mono text-white tracking-tighter mb-2">{value}</div>
        {trend && (
            <div className={`text-xs font-mono flex items-center gap-2 ${trendDir === 'up' ? 'text-green-400' : trendDir === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
                {trendDir === 'up' ? '+' : ''}{trend} <span className="text-slate-600">vs last period</span>
            </div>
        )}
    </div>
);

// --- Pill Navigation Component ---

const PillNavigation = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: any) => void }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const allTabs = [
        { id: 'identity', label: 'Identity' },
        { id: 'atoms', label: 'Atoms' },
        { id: 'modules', label: 'Modules' },
        { id: 'flows', label: 'Flows' },
        { id: 'dashboards', label: 'Dashboards' },
        { id: 'stack', label: 'Stack' },
    ];

    // Mobile Priority Logic: Show 3 primary tabs, rest in "More"
    // Desktop Logic: Show all tabs, hide "More"
    const primaryTabs = allTabs.slice(0, 3);
    const secondaryTabs = allTabs.slice(3);
    const isOverflowActive = secondaryTabs.some(t => t.id === activeTab);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
            <nav className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-4 pr-2 flex items-center justify-between shadow-2xl shadow-black/50 ring-1 ring-white/5">
                
                {/* Logo Section */}
                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-900/20">
                         <CrowdStackLogo className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:block font-black tracking-tighter text-sm text-white">CROWDSTACK<span className="text-purple-500">.</span></span>
                </div>

                {/* Nav Links */}
                <div className="flex-1 flex items-center justify-center gap-1 px-2 md:px-4">
                    {/* Primary Tabs - Always Visible */}
                    {primaryTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-black shadow-lg' 
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}

                    {/* Secondary Tabs - Hidden on Mobile, Block on Desktop */}
                    {secondaryTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`hidden md:block px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-black shadow-lg' 
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}

                    {/* More Button - Visible on Mobile Only */}
                    <div className="relative md:hidden">
                        <button
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className={`p-1.5 rounded-full transition-all ${
                                isOverflowActive || isMoreOpen
                                ? 'bg-white text-black shadow-lg' 
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {/* Overflow Menu */}
                        {isMoreOpen && (
                            <div className="absolute top-full right-0 mt-4 w-40 bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 ring-1 ring-white/5 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-1">
                                {secondaryTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id); setIsMoreOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            activeTab === tab.id 
                                            ? 'bg-white/10 text-white' 
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* User Profile Section */}
                <div className="relative pl-2 border-l border-white/10">
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 p-1 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden relative">
                            <img src="https://i.pravatar.cc/150?img=11" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0A0A0A]" />
                        </div>
                        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 ring-1 ring-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="p-3 border-b border-white/5 mb-1">
                                <p className="text-sm font-bold text-white">Alexandr V.</p>
                                <p className="text-[10px] text-slate-500 font-mono">alex@crowdstack.ai</p>
                             </div>
                             <div className="space-y-1">
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <User className="w-3 h-3" /> Profile
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <Settings className="w-3 h-3" /> Settings
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <CreditCard className="w-3 h-3" /> Billing
                                </button>
                             </div>
                             <div className="mt-1 pt-1 border-t border-white/5">
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <LogOut className="w-3 h-3" /> Log Out
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
};

const App = () => {
  const [activeTab, setActiveTab] = useState<'identity' | 'atoms' | 'modules' | 'flows' | 'dashboards' | 'stack'>('identity');
  const [dashboardType, setDashboardType] = useState<'door' | 'organizer' | 'me'>('door');
  const [copied, setCopied] = useState<string | null>(null);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const colors = [
    { name: "Void Black", hex: "#050505", usage: "Global Background" },
    { name: "Glass Surface", hex: "#0A0A0A", usage: "Cards / Containers" },
    { name: "Neural Purple", hex: "#A855F7", usage: "Primary Action" },
    { name: "Digital Blue", hex: "#3B82F6", usage: "Information / Links" },
    { name: "Signal Green", hex: "#10B981", usage: "Success / Valid" },
    { name: "Alert Amber", hex: "#F59E0B", usage: "Warning / Pending" },
    { name: "Critical Red", hex: "#EF4444", usage: "Error / Invalid" },
    { name: "Muted Slate", hex: "#475569", usage: "Icons / Placeholders" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-purple-500/30 pb-32">
      
      {/* --- NEW PILL NAVIGATION --- */}
      <PillNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Design System Header */}
      <div className="bg-gradient-to-r from-[#111] to-[#050505] border-b border-white/5 pt-32 pb-12 px-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 blur-[150px] rounded-full -mr-32 -mt-32" />
         <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Badge color="purple" variant="solid">Design System v4.3</Badge>
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Code: CS-DS-2025</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6">
               DESIGN <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">BIBLE</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
               The canonical specification for CrowdStack. Focus areas: Registration, Live Operations, and Data Visualization.
            </p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* === TAB 1: IDENTITY & TYPOGRAPHY === */}
        {activeTab === 'identity' && (
            <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Typography Architecture */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-4">
                        <h3 className="text-xl font-bold text-white mb-4">Typography Architecture</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            The system relies on a high-contrast pairing of <strong className="text-white">Inter</strong> (UI/Body) and <strong className="text-white">JetBrains Mono</strong> (Data/Labels).
                        </p>
                        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-1">
                            <DesignSpecBlock label="Primary Sans" value="Inter" />
                            <DesignSpecBlock label="Primary Mono" value="JetBrains Mono" font="font-mono" />
                            <DesignSpecBlock label="Scale Ratio" value="1.250 (Major Third)" font="font-mono text-purple-400" />
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-12">
                        {/* Headings */}
                        <div className="space-y-6">
                             <div>
                                 <span className="font-mono text-[10px] text-purple-400 mb-2 block">DISPLAY H1</span>
                                 <p className="font-sans font-black text-6xl tracking-tighter text-white uppercase">Visual System</p>
                             </div>
                             <div>
                                 <span className="font-mono text-[10px] text-purple-400 mb-2 block">HEADING H2</span>
                                 <p className="font-sans font-extrabold text-4xl tracking-tight text-white">Operational Protocol</p>
                             </div>
                             <div>
                                 <span className="font-mono text-[10px] text-purple-400 mb-2 block">SUBHEADING H3</span>
                                 <p className="font-sans font-bold text-2xl tracking-normal text-white">Event Metadata</p>
                             </div>
                        </div>
                        
                        {/* Specialized Styles */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                             <div>
                                 <span className="font-mono text-[10px] text-purple-400 mb-2 block">SMALL CAPS LABEL</span>
                                 <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                     System_Status :: Active
                                 </p>
                                 <p className="text-xs text-slate-600 mt-2">Use for: Form labels, table headers, tiny metadata.</p>
                             </div>
                             <div>
                                 <span className="font-mono text-[10px] text-purple-400 mb-2 block">MONO DATA</span>
                                 <p className="font-mono text-xs text-slate-300">
                                     ID: 8821-XF<br/>
                                     TS: 14:02:51 UTC
                                 </p>
                                 <p className="text-xs text-slate-600 mt-2">Use for: IDs, timestamps, technical values.</p>
                             </div>
                             <div>
                                <span className="font-mono text-[10px] text-purple-400 mb-2 block">SECTION HEADER</span>
                                <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">
                                    01. Architecture
                                </h3>
                                <p className="text-xs text-slate-600 mt-2">Use for: Major page sections, module dividers.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-white/5" />

                {/* Color Palette */}
                <section>
                    <h3 className="text-xl font-bold text-white mb-8">Neural Palette</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        {colors.map(c => <ColorSwatch key={c.hex} {...c} />)}
                    </div>
                </section>

                <div className="h-px bg-white/5" />

                 {/* Prompt Injection */}
                <section className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                          <Terminal className="w-5 h-5 text-purple-400" />
                          <h4 className="text-white font-bold">GenAI Context Injection</h4>
                      </div>
                      <p className="text-slate-400 text-sm max-w-xl">
                         The full design bible is encoded into this system prompt. Use this to prime AI agents to generate UI/UX strictly adhering to these guidelines.
                      </p>
                   </div>
                   <button 
                      onClick={() => copyToClipboard(CROWDSTACK_SYSTEM_PROMPT)}
                      className="px-6 py-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                   >
                      {copied === CROWDSTACK_SYSTEM_PROMPT ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy System Prompt
                   </button>
                </section>
            </div>
        )}

        {/* === TAB 2: ATOMS === */}
        {activeTab === 'atoms' && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Navigation Spec */}
                <section>
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-8">01. Navigation Architecture</h3>
                    <div className="bg-[#111] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Layout className="w-24 h-24" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-4">THE PILL (DYNAMIC DOCK)</h4>
                        <p className="text-slate-400 text-sm mb-6 max-w-lg">
                            Primary navigation is contained within a floating capsule. This "island" separates UI chrome from content, maximizing immersion.
                        </p>
                        <div className="space-y-2 font-mono text-xs text-slate-500">
                            <div className="flex gap-4">
                                <span className="text-purple-400">POS</span>
                                <span>Fixed Top (z-50)</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-purple-400">BG</span>
                                <span>Backdrop Blur XL + Black/90</span>
                            </div>
                            <div className="flex gap-4">
                                <span className="text-purple-400">FX</span>
                                <span>Shadow-2xl + Ring-1 White/10</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Buttons */}
                <section>
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-8">02. Interactive Elements</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="space-y-6">
                            <h4 className="text-xs font-mono text-slate-500 mb-4">BUTTONS</h4>
                            <div className="space-y-4">
                                <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold tracking-widest uppercase text-xs hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/20">
                                    Primary Action
                                </button>
                                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-slate-300 font-mono text-xs hover:bg-white/10 transition-colors">
                                    Secondary Operation
                                </button>
                                <button className="w-full py-2 text-slate-500 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <Trash2 className="w-3 h-3" /> Ghost / Destructive
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <h4 className="text-xs font-mono text-slate-500 mb-4">INPUT FIELDS</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2 block">Standard Input</label>
                                    <input type="text" placeholder="Start typing..." className="block w-full px-4 py-3 bg-[#111] border border-white/5 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2 block">With Icon</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                        <input type="text" placeholder="Search guests..." className="block w-full pl-10 pr-4 py-3 bg-[#111] border border-white/5 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <h4 className="text-xs font-mono text-slate-500 mb-4">CONTROLS</h4>
                             <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-white/5 rounded-xl">
                                <span className="text-sm font-bold text-white">Auto-Sync</span>
                                <ToggleRight className="w-8 h-8 text-purple-500 fill-current opacity-20" />
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded border border-white/20 bg-[#111] flex items-center justify-center">
                                   <Check className="w-3 h-3 text-purple-500" />
                                </div>
                                <span className="text-xs text-slate-300">Option Selected</span>
                             </div>
                        </div>
                    </div>
                </section>

                {/* Tags & Badges */}
                <section>
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-8">03. Status Indicators</h3>
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-xs font-mono text-slate-500 mb-4">SOLID (Primary Status)</h4>
                            <div className="flex flex-wrap gap-3">
                                <Badge color="purple" variant="solid">VIP Access</Badge>
                                <Badge color="blue" variant="solid">Checked In</Badge>
                                <Badge color="green" variant="solid">Approved</Badge>
                                <Badge color="amber" variant="solid">Waitlist</Badge>
                                <Badge color="red" variant="solid">Banned</Badge>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-mono text-slate-500 mb-4">OUTLINE (Secondary/Metadata)</h4>
                            <div className="flex flex-wrap gap-3">
                                <Badge color="purple" variant="outline">Techno</Badge>
                                <Badge color="blue" variant="outline">Tier 1</Badge>
                                <Badge color="green" variant="outline">Paid</Badge>
                                <Badge color="slate" variant="outline">Draft</Badge>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-mono text-slate-500 mb-4">GHOST (Subtle)</h4>
                            <div className="flex flex-wrap gap-3">
                                <Badge color="slate" variant="ghost">#house</Badge>
                                <Badge color="slate" variant="ghost">#party</Badge>
                                <Badge color="slate" variant="ghost">21+</Badge>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        )}

        {/* === TAB 3: MODULES === */}
        {activeTab === 'modules' && (
            <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* EVENT CARDS */}
                <section>
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                         <h3 className="text-lg font-bold text-white uppercase tracking-widest">01. The Monolith (Event Card)</h3>
                         <span className="text-[10px] font-mono text-purple-400">ASPECT 9:16</span>
                    </div>
                    
                    {/* UPDATED GRID FOR MOBILE (2 COLS) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {/* Standard Event (Unregistered State) */}
                        <div className="aspect-[9/16] bg-[#0a0a0a] rounded-3xl overflow-hidden relative group border border-white/5 hover:border-purple-500/30 transition-all shadow-2xl">
                             <img src="https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent opacity-90" />
                             
                             <div className="absolute inset-0 p-3 md:p-6 flex flex-col justify-end">
                                 <div className="mb-auto flex justify-between items-start">
                                     <Badge color="purple" variant="solid">Nightclub</Badge>
                                     <button className="p-1.5 md:p-2 bg-white/10 rounded-full text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                                     </button>
                                 </div>
                                 <div className="space-y-2 md:space-y-4">
                                     <div>
                                         <p className="text-purple-400 font-mono text-[9px] md:text-xs uppercase tracking-widest mb-1">Tomorrow • 22:00</p>
                                         <h3 className="text-xl md:text-3xl font-black text-white leading-none tracking-tighter uppercase">Neon<br/>Horizon</h3>
                                     </div>

                                     {/* Attendees & Info */}
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#050505] bg-slate-800 overflow-hidden"><img src="https://i.pravatar.cc/100?img=12" className="w-full h-full object-cover" /></div>
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#050505] bg-slate-800 overflow-hidden"><img src="https://i.pravatar.cc/100?img=24" className="w-full h-full object-cover" /></div>
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#050505] bg-slate-800 overflow-hidden"><img src="https://i.pravatar.cc/100?img=35" className="w-full h-full object-cover" /></div>
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-bold text-slate-300">+482</span>
                                        </div>
                                        <div className="text-[9px] md:text-[10px] font-mono text-slate-400">
                                            From <span className="text-white font-bold">$20</span>
                                        </div>
                                     </div>

                                     <button className="w-full py-2 md:py-3 bg-white text-black hover:bg-slate-200 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-lg transition-colors border border-transparent shadow-lg shadow-white/10">
                                         Register
                                     </button>
                                 </div>
                             </div>
                        </div>

                        {/* Standard Event (Registered State) */}
                        <div className="aspect-[9/16] bg-[#0a0a0a] rounded-3xl overflow-hidden relative group border border-purple-500/30 transition-all shadow-2xl">
                             <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover opacity-60" />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent opacity-90" />
                             
                             <div className="absolute inset-0 p-3 md:p-6 flex flex-col justify-end">
                                 <div className="mb-auto flex justify-between items-start">
                                     <Badge color="green" variant="solid">Attending</Badge>
                                     <button className="p-1.5 md:p-2 bg-white/10 rounded-full text-white backdrop-blur-sm hover:bg-white/20 transition-colors">
                                        <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                                     </button>
                                 </div>
                                 <div className="space-y-2 md:space-y-4">
                                     <div>
                                         <p className="text-green-400 font-mono text-[9px] md:text-xs uppercase tracking-widest mb-1">Sat 28 Oct • 23:00</p>
                                         <h3 className="text-xl md:text-3xl font-black text-white leading-none tracking-tighter uppercase">Acid<br/>Rain</h3>
                                     </div>

                                      {/* Attendees & Info */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#050505] bg-slate-800 overflow-hidden"><img src="https://i.pravatar.cc/100?img=5" className="w-full h-full object-cover" /></div>
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#050505] bg-slate-800 overflow-hidden"><img src="https://i.pravatar.cc/100?img=8" className="w-full h-full object-cover" /></div>
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-bold text-slate-300">+2.1k</span>
                                        </div>
                                        <Badge color="green" variant="outline">VIP</Badge>
                                     </div>

                                     <div className="grid grid-cols-4 gap-2">
                                        <button className="col-span-3 py-2 md:py-3 bg-green-600 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                                            <Check className="w-3 h-3" /> Ticket
                                        </button>
                                        <button className="col-span-1 py-2 md:py-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-400 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center">
                                            <X className="w-3 h-3" />
                                        </button>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* Live/Active Event */}
                        <div className="aspect-[9/16] bg-[#0a0a0a] rounded-3xl overflow-hidden relative group border border-white/5 hover:border-green-500/30 transition-all shadow-2xl">
                             <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 via-transparent to-transparent opacity-60 mix-blend-overlay" />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                             
                             <div className="absolute top-2 left-2 md:top-4 md:left-4">
                                 <div className="flex items-center gap-1 md:gap-2 px-1.5 py-0.5 md:px-2 md:py-1 bg-green-500/20 border border-green-500/50 rounded text-[8px] md:text-[9px] font-bold text-green-200 uppercase tracking-wider animate-pulse">
                                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Live
                                 </div>
                             </div>

                             <div className="absolute inset-0 p-3 md:p-6 flex flex-col justify-end">
                                 <div className="space-y-1 mb-2 md:mb-6">
                                     <h3 className="text-lg md:text-2xl font-black text-white leading-none tracking-tight">THE VOID</h3>
                                     <p className="text-green-200 text-[10px] md:text-sm font-medium">84% Cap</p>
                                 </div>
                                 <div className="grid grid-cols-2 gap-1 md:gap-2">
                                     <button className="py-2 md:py-3 bg-green-600 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                                         <QrCode className="w-3 h-3 fill-current" /> <span className="hidden md:inline">Show QR</span>
                                     </button>
                                     <button className="py-2 md:py-3 bg-white/5 text-slate-300 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors">
                                         Status
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                </section>

                {/* VENUE CARDS */}
                <section>
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                         <h3 className="text-lg font-bold text-white uppercase tracking-widest">02. Venue Architecture</h3>
                         <span className="text-[10px] font-mono text-purple-400">STRUCTURE & ROWS</span>
                    </div>

                    <div className="space-y-12">
                         {/* Venue Card (Standard) */}
                         <div>
                            <h4 className="text-xs font-mono text-slate-500 uppercase mb-4">Standard Card</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2].map(i => (
                                    <div key={i} className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-all">
                                        {/* Hero Image */}
                                        <div className="h-48 w-full relative">
                                            <img src={`https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&w=800&q=80&sig=${i}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                                            {/* Overlapping Logo */}
                                            <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl border-4 border-[#0A0A0A] bg-[#111] overflow-hidden shadow-lg">
                                                <img src={`https://i.pravatar.cc/100?img=${i+50}`} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        {/* Content */}
                                        <div className="pt-10 px-6 pb-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white leading-tight">The Warehouse</h3>
                                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>Downtown District</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-xs font-bold text-white">
                                                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                                                    4.9
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <Badge color="purple" variant="ghost">Techno</Badge>
                                                <Badge color="blue" variant="ghost">Cocktails</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>

                         {/* Venue Macro Row */}
                         <div>
                            <h4 className="text-xs font-mono text-slate-500 uppercase mb-4">Macro Row (Expanded)</h4>
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all p-2 gap-4">
                                    <div className="w-full md:w-48 aspect-video md:aspect-auto relative rounded-xl overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 left-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center">
                                            <Music className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 py-2 pr-4 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-lg font-bold text-white">Electric Garden</h4>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" /> 128 Industry Way, Sector 4
                                                </p>
                                            </div>
                                            <Badge color="green" variant="outline">Open Now</Badge>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex gap-4 text-xs font-mono text-slate-400">
                                                <span>Cap: 2,500</span>
                                                <span>Type: Open Air</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </div>

                         {/* Venue Micro Row */}
                         <div>
                            <h4 className="text-xs font-mono text-slate-500 uppercase mb-4">Micro Row (Thin)</h4>
                            <div className="space-y-2 max-w-2xl">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center p-2 pr-4 bg-[#0A0A0A] border border-white/5 rounded-xl hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 mr-4 overflow-hidden relative border border-white/10">
                                            <img src={`https://i.pravatar.cc/100?img=${i+20}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-sm font-bold text-white truncate">Subterranean Club</h5>
                                            <p className="text-[10px] text-slate-500 truncate">Techno • Deep House</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                             <ArrowRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                </section>

                {/* LIST ROWS (Legacy) */}
                <section>
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                         <h3 className="text-lg font-bold text-white uppercase tracking-widest">03. List Architecture</h3>
                         <span className="text-[10px] font-mono text-purple-400">STACK & ROWS</span>
                    </div>
                    
                    <div className="space-y-8 max-w-4xl">
                        
                        {/* Guestlist Row */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-mono text-slate-500 uppercase mb-2">Registration Row (72px)</h4>
                            {[1, 2].map(i => (
                                <div key={i} className="group flex items-center p-3 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-purple-500/20 hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full overflow-hidden mr-4 relative border border-white/10">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-sm font-bold text-white">Alexandr V.</h5>
                                        <p className="text-xs text-slate-500 font-mono">alex@example.com</p>
                                    </div>
                                    <div className="flex items-center gap-6 px-4">
                                         <Badge color={i === 1 ? 'green' : 'amber'} variant="outline">{i === 1 ? 'Checked In' : 'Registered'}</Badge>
                                         <span className="text-[10px] font-mono text-slate-600 hidden sm:block">ID: 8821-{i}X</span>
                                    </div>
                                    <button className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Registration Tier Row */}
                         <div className="space-y-2">
                            <h4 className="text-xs font-mono text-slate-500 uppercase mb-2">Tier Progress Row</h4>
                            {[
                                { name: "Early Bird", price: "Free", sold: 150, total: 150, color: "green" },
                                { name: "General Admission", price: "$20.00", sold: 84, total: 400, color: "purple" }
                            ].map((tier: any, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-[#111] border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-4 w-48">
                                        <div className={`w-2 h-8 rounded-full bg-${tier.color}-500`} />
                                        <div>
                                            <h5 className="text-sm font-bold text-white">{tier.name}</h5>
                                            <p className="text-xs text-slate-500 font-mono">{tier.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 px-8">
                                        <div className="flex justify-between text-[10px] text-slate-400 uppercase mb-1">
                                            <span>Capacity</span>
                                            <span>{Math.round((tier.sold / tier.total) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full bg-${tier.color}-500`} style={{ width: `${(tier.sold / tier.total) * 100}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-right w-24">
                                        <div className="text-sm font-bold text-white">{tier.sold}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Regs</div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </section>
            </div>
        )}

        {/* === TAB 4: REGISTRATION FLOWS === */}
        {activeTab === 'flows' && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section className="max-w-3xl mx-auto text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Focused Entry Pattern</h3>
                    <p className="text-slate-400 text-sm mb-12">
                        Used for Typeform-style registration flows. One question at a time, high focus, large typography.
                    </p>
                    
                    <div className="bg-[#050505] border border-white/5 rounded-3xl p-12 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                        {/* Background Noise */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                        
                        <div className="relative z-10 w-full max-w-md space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Step 01</span>
                                <h2 className="text-3xl font-black text-white tracking-tight">What's your email?</h2>
                                <p className="text-slate-500 text-sm">We'll send your QR code here.</p>
                            </div>
                            
                            <div className="relative group">
                                <input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    className="w-full bg-transparent border-b-2 border-white/20 py-4 text-2xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-purple-500 transition-colors text-center font-sans"
                                />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Press Enter ↵</span>
                                </div>
                            </div>

                            <button className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-purple-400 transition-colors">
                                Continue
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                            <div className="h-full bg-purple-500 w-[25%]" />
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* QR Code Container */}
                    <div className="bg-[#white] p-8 rounded-3xl bg-white text-black flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                        <h3 className="text-2xl font-black tracking-tighter mb-2">ADMIT ONE</h3>
                        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-8">Neon Horizon • 24 Oct</p>
                        
                        <div className="p-4 bg-black rounded-xl mb-8">
                            <QrCode className="w-48 h-48 text-white" />
                        </div>
                        
                        <div className="w-full border-t border-slate-200 pt-6">
                            <div className="flex justify-between text-left">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Guest</p>
                                    <p className="font-bold">Alexandr V.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">ID</p>
                                    <p className="font-mono text-sm">8821-XF</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scanner Interface */}
                    <div className="bg-[#000] border border-white/10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center p-8">
                        {/* Camera Feed Sim */}
                        <div className="absolute inset-0 bg-slate-900 opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-purple-500/50 rounded-3xl relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-purple-500 -mt-1 -ml-1" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-purple-500 -mt-1 -mr-1" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-purple-500 -mb-1 -ml-1" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-purple-500 -mb-1 -mr-1" />
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                            </div>
                        </div>
                        
                        <div className="relative z-10 mt-auto bg-black/80 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 border border-white/10">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-white">Scanning Active</span>
                        </div>
                    </div>
                </section>
            </div>
        )}

        {/* === TAB 5: DASHBOARDS === */}
        {activeTab === 'dashboards' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Command Center</h2>
                        <p className="text-slate-400 text-sm">Real-time operations for {dashboardType} role.</p>
                    </div>
                    
                    {/* Dashboard Role Switcher */}
                    <div className="flex p-1 bg-[#111] border border-white/10 rounded-lg">
                        {['door', 'organizer', 'me'].map((t: any) => (
                             <button 
                                key={t}
                                onClick={() => setDashboardType(t)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${dashboardType === t ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                             >
                                {t}
                             </button>
                        ))}
                    </div>
                </div>

                {/* Conditional Stat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dashboardType === 'door' && (
                        <>
                            <StatCard label="Total Check-ins" value="482" trend="12/min" trendDir="up" />
                            <StatCard label="Remaining" value="118" trend="80% In" trendDir="down" />
                            <StatCard label="Issues" value="3" trend="Flagged" trendDir="down" />
                            <StatCard label="Capacity" value="92%" trend="Critical" trendDir="neutral" />
                        </>
                    )}
                    {dashboardType === 'organizer' && (
                        <>
                             <StatCard label="Total Registrations" value="1,204" trend="Sold Out" trendDir="up" />
                             <StatCard label="Actual Attendance" value="842" trend="70% Yield" trendDir="up" />
                             <StatCard label="Bar Revenue" value="$12.4k" trend="High" trendDir="up" />
                             <StatCard label="Peak Time" value="01:00" trend="Predicted" trendDir="neutral" />
                        </>
                    )}
                    {dashboardType === 'me' && (
                         <>
                            {/* XP Module */}
                            <div className="md:col-span-2 p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl relative overflow-hidden group hover:border-purple-500/20 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <Zap className="w-24 h-24 text-purple-500" />
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1 block">CrowdStack XP</span>
                                        <h3 className="text-3xl font-black text-white italic">LEVEL 07</h3>
                                    </div>
                                    <div className="px-3 py-1 bg-purple-500 rounded text-xs font-bold text-white shadow-lg shadow-purple-900/40">
                                        Night Owl
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-mono text-slate-400">
                                        <span>Progress to Lvl 08</span>
                                        <span>2,450 / 3,000 XP</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                                        <div className="absolute inset-0 bg-white/5 animate-[pulse_3s_ease-in-out_infinite]" />
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-[82%] relative">
                                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-500 fill-current" /> Next Reward: Priority Queue Jump (Tier 2)
                                    </p>
                                </div>
                            </div>
                            
                            <StatCard label="Events Attended" value="42" trend="Top 5%" trendDir="up" />
                            <StatCard label="Wallet Balance" value="$120" trend="+Credit" trendDir="neutral" />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area based on Dashboard Type */}
                    
                    {(dashboardType === 'door' || dashboardType === 'organizer') && (
                        <>
                            {/* Main Chart Area */}
                            <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 min-h-[400px] relative overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-purple-400" /> 
                                        {dashboardType === 'door' ? 'Entry Velocity (Pax/Min)' : 'Live Attendance Curve'}
                                    </h3>
                                    <div className="flex gap-2">
                                        <Badge color="purple" variant="solid">Live</Badge>
                                        <Badge color="slate" variant="ghost">Last 1h</Badge>
                                    </div>
                                </div>
                                {/* Simulated Chart */}
                                <div className="absolute inset-x-0 bottom-0 h-64 flex items-end justify-between px-8 pb-8 gap-2">
                                    {[20, 35, 45, 60, 55, 70, 80, 90, 85, 75, 90, 95, 80, 60, 50, 40, 30, 20, 15, 10].map((h, i) => (
                                        <div key={i} className="w-full bg-purple-500/20 hover:bg-purple-500/50 transition-colors rounded-t-sm relative group" style={{ height: `${h}%` }}>
                                        </div>
                                    ))}
                                </div>
                                {/* Grid Lines */}
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
                            </div>

                            {/* Side Panel */}
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
                                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-400" /> Live Feed
                                </h3>
                                
                                <div className="space-y-4">
                                    {[
                                        { user: "Sarah J.", time: "Just now", status: "Checked In", color: "green" },
                                        { user: "Mike T.", time: "2m ago", status: "Checked In", color: "green" },
                                        { user: "Unknown ID", time: "5m ago", status: "Invalid QR", color: "red" },
                                        { user: "Felix K.", time: "8m ago", status: "VIP Entry", color: "purple" },
                                    ].map((log, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full bg-${log.color}-500`} />
                                                <div>
                                                    <p className="text-xs font-bold text-white">{log.user}</p>
                                                    <p className="text-[10px] text-slate-500">{log.time}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase text-${log.color}-400`}>{log.status}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <button className="w-full mt-6 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-colors">
                                    View Full Log
                                </button>
                            </div>
                        </>
                    )}

                    {dashboardType === 'me' && (
                        <div className="lg:col-span-3 space-y-12">
                            {/* Upcoming Events Row */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-400" /> 
                                        Upcoming Schedule
                                    </h3>
                                    <button className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white">View All</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Event Card Mini */}
                                    <div className="aspect-[9/16] bg-[#0a0a0a] rounded-3xl overflow-hidden relative group border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                                         <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                         <div className="absolute bottom-0 left-0 p-6">
                                             <Badge color="green" variant="solid">Tomorrow</Badge>
                                             <div className="mt-2">
                                                 <h4 className="text-xl font-bold text-white leading-tight mb-1">Midnight Protocol</h4>
                                                 <p className="text-xs font-mono text-slate-400">The Basement • 23:00</p>
                                             </div>
                                         </div>
                                    </div>
                                    <div className="aspect-[9/16] bg-[#0a0a0a] rounded-3xl overflow-hidden relative group border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                                         <img src="https://images.unsplash.com/photo-1570158268183-d296b2892211?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                         <div className="absolute bottom-0 left-0 p-6">
                                             <Badge color="purple" variant="outline">Next Week</Badge>
                                             <div className="mt-2">
                                                 <h4 className="text-xl font-bold text-white leading-tight mb-1">Neon Garden</h4>
                                                 <p className="text-xs font-mono text-slate-400">Sky Lounge • 20:00</p>
                                             </div>
                                         </div>
                                    </div>
                                    {/* Add Event Placeholder */}
                                    <button className="aspect-[9/16] bg-[#111] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/5 hover:border-white/20 transition-all group">
                                         <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                             <Plus className="w-6 h-6 text-slate-500 group-hover:text-white" />
                                         </div>
                                         <span className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-white">Find Event</span>
                                    </button>
                                </div>
                            </section>

                            {/* Favorite Venues */}
                             <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-red-400" /> 
                                        Favorite Venues
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Reuse Venue Card */}
                                     <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden group hover:border-red-500/30 transition-all cursor-pointer">
                                        <div className="h-40 w-full relative">
                                            <img src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur rounded-full p-2 text-red-500 border border-white/10">
                                                <Heart className="w-4 h-4 fill-current" />
                                            </div>
                                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                                <Star className="w-3 h-3 text-amber-400 fill-current inline mr-1" /> 4.9
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-lg font-bold text-white mb-1">Electric Garden</h3>
                                            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> Downtown District
                                            </p>
                                            <div className="flex gap-2">
                                                <Badge color="purple" variant="ghost">House</Badge>
                                                <Badge color="green" variant="ghost">Rooftop</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                     <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden group hover:border-red-500/30 transition-all cursor-pointer">
                                        <div className="h-40 w-full relative">
                                            <img src="https://images.unsplash.com/photo-1578736641330-3155e606cd40?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur rounded-full p-2 text-red-500 border border-white/10">
                                                <Heart className="w-4 h-4 fill-current" />
                                            </div>
                                             <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                                <Star className="w-3 h-3 text-amber-400 fill-current inline mr-1" /> 4.7
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-lg font-bold text-white mb-1">The Vault</h3>
                                            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> Financial Sector
                                            </p>
                                            <div className="flex gap-2">
                                                <Badge color="blue" variant="ghost">Jazz</Badge>
                                                <Badge color="amber" variant="ghost">Speakeasy</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </section>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* === TAB 6: UI STACK === */}
        {activeTab === 'stack' && (
             <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                    <div className="flex items-center gap-3 mb-8">
                         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-900/20">
                             <Code2 className="w-6 h-6 text-white" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Technological Foundation</h2>
                            <p className="text-slate-400 text-sm">The architectural components powering this interface.</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Column 1: Core Tech */}
                        <div>
                             <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-purple-400" /> Core Stack
                             </h3>
                             <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-1">
                                <DesignSpecBlock label="Framework" value="React 19" />
                                <DesignSpecBlock label="Styling Engine" value="Tailwind CSS v3.4" />
                                <DesignSpecBlock label="Iconography" value="Lucide React" />
                                <DesignSpecBlock label="Typeface (Sans)" value="Inter" />
                                <DesignSpecBlock label="Typeface (Mono)" value="JetBrains Mono" font="font-mono" />
                                <DesignSpecBlock label="Build System" value="ESM Modules (Browser Native)" font="font-mono text-slate-500" />
                             </div>
                        </div>

                        {/* Column 2: Design Patterns */}
                        <div>
                             <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                                <Box className="w-4 h-4 text-blue-400" /> Design Patterns
                             </h3>
                             <ul className="space-y-3">
                                {[
                                    "Bento Grid Layouts (Dashboard Modules)",
                                    "Glassmorphism (Background Blur + Noise)",
                                    "Heads Up Display (HUD) Aesthetic",
                                    "Floating Dock Navigation (The Pill)",
                                    "Card-Based Information Architecture",
                                    "Monolithic Event Posters (9:16 Aspect)",
                                    "Split-Pane Registration Flows",
                                    "Gamified XP Progress Modules"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/20 transition-colors">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        {item}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>
                </section>
             </div>
        )}

      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);