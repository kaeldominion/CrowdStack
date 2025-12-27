"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Building2,
  Calendar,
  Users,
  Megaphone,
  QrCode,
  BarChart3,
  Shield,
  Bell,
  Zap,
  Trophy,
  Wallet,
  LineChart,
  UserCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Camera,
  Globe,
  Lock,
  FileText,
  CreditCard,
  PieChart,
  Activity,
  Smartphone,
  Link as LinkIcon,
  Mail,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Card, Badge, Button } from "@crowdstack/ui";

export default function ForBusinessPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const y2 = useTransform(scrollY, [0, 300], [0, -80]);

  const platformFeatures = [
    {
      title: "Instant QR Check-in",
      description: "Lightning-fast entry scanning that works offline. Door staff can check in hundreds of guests per hour with real-time sync.",
      icon: <QrCode className="h-6 w-6" />,
      color: "from-accent-secondary to-blue-600",
    },
    {
      title: "Promoter Attribution",
      description: "Track every guest back to the promoter who brought them. Automatic commission calculations and transparent payouts.",
      icon: <Trophy className="h-6 w-6" />,
      color: "from-accent-warning to-orange-600",
    },
    {
      title: "Real-time Analytics",
      description: "Complete visibility into attendance, revenue, and trends. Compare events, track peak times, and optimize capacity.",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "from-accent-success to-emerald-600",
    },
    {
      title: "Event Approval Flow",
      description: "Venues approve events before they go live. Pre-approve trusted organizers for seamless recurring events.",
      icon: <Shield className="h-6 w-6" />,
      color: "from-accent-primary to-purple-600",
    },
    {
      title: "Smart Notifications",
      description: "Real-time alerts for pending approvals, check-in milestones, and event updates. Never miss an important moment.",
      icon: <Bell className="h-6 w-6" />,
      color: "from-pink-500 to-rose-600",
    },
    {
      title: "Magic Link Auth",
      description: "Frictionless registration with no passwords. Guests sign up in seconds with just their phone number.",
      icon: <Zap className="h-6 w-6" />,
      color: "from-cyan-500 to-teal-600",
    },
    {
      title: "Commission Tracking",
      description: "Automatic commission calculations based on check-ins. Transparent payouts for your promoter team.",
      icon: <Wallet className="h-6 w-6" />,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Photo Galleries",
      description: "Capture and share event photos. Guests can find and share their pictures automatically.",
      icon: <Camera className="h-6 w-6" />,
      color: "from-violet-500 to-purple-600",
    },
  ];

  const roleFeatures = {
    venues: {
      title: "Venues",
      subtitle: "Own your space, own your data",
      description: "Complete visibility into every event, every guest, every promoter performance across your space. Take control of your venue operations.",
      icon: <Building2 className="h-8 w-8" />,
      color: "from-accent-secondary to-blue-600",
      features: [
        { icon: <Shield className="h-5 w-5" />, title: "Event Approval", description: "Review and approve events before they go live at your venue" },
        { icon: <BarChart3 className="h-5 w-5" />, title: "Venue Analytics", description: "Track attendance trends, peak times, and venue utilization" },
        { icon: <UserCheck className="h-5 w-5" />, title: "Staff Management", description: "Assign door staff and manage access permissions" },
        { icon: <LineChart className="h-5 w-5" />, title: "Performance Reports", description: "Compare events, organizers, and promoter performance" },
        { icon: <Calendar className="h-5 w-5" />, title: "Calendar View", description: "See all upcoming and past events in one place" },
        { icon: <Bell className="h-5 w-5" />, title: "Instant Alerts", description: "Get notified of pending approvals and event milestones" },
      ],
    },
    organizers: {
      title: "Organizers",
      subtitle: "Run events with precision",
      description: "Create events, manage promoter teams, and get real-time insights into registrations and check-ins. Everything you need to run successful events.",
      icon: <Calendar className="h-8 w-8" />,
      color: "from-accent-primary to-purple-600",
      features: [
        { icon: <FileText className="h-5 w-5" />, title: "Event Creation", description: "Set up events with capacity, pricing tiers, and custom fields" },
        { icon: <Users className="h-5 w-5" />, title: "Team Invites", description: "Invite promoters and assign commission structures" },
        { icon: <LinkIcon className="h-5 w-5" />, title: "Tracking Links", description: "Generate unique links for each promoter to share" },
        { icon: <PieChart className="h-5 w-5" />, title: "Live Dashboard", description: "Real-time view of registrations and check-ins" },
        { icon: <CreditCard className="h-5 w-5" />, title: "Commission Payouts", description: "Automatic calculation and payment tracking" },
        { icon: <Camera className="h-5 w-5" />, title: "Photo Management", description: "Upload and organize event photos for guests" },
      ],
    },
    promoters: {
      title: "Promoters",
      subtitle: "Get recognized for your hustle",
      description: "Get your own tracking links, see your stats in real-time, and get paid automatically based on actual check-ins. Your effort, verified.",
      icon: <Megaphone className="h-8 w-8" />,
      color: "from-accent-warning to-orange-600",
      features: [
        { icon: <QrCode className="h-5 w-5" />, title: "Personal QR Codes", description: "Unique invite codes and QR for your network" },
        { icon: <Activity className="h-5 w-5" />, title: "Real-time Stats", description: "Track registrations and check-ins as they happen" },
        { icon: <Wallet className="h-5 w-5" />, title: "Commission Tracking", description: "See exactly what you've earned for each event" },
        { icon: <Trophy className="h-5 w-5" />, title: "Leaderboard Rank", description: "Compete with other promoters and climb the ranks" },
        { icon: <TrendingUp className="h-5 w-5" />, title: "Performance History", description: "Build your track record across all events" },
        { icon: <Smartphone className="h-5 w-5" />, title: "Mobile-First", description: "Access everything from your phone, no app needed" },
      ],
    },
  };

  const stats = [
    { value: "50K+", label: "Guests Checked In" },
    { value: "200+", label: "Events Managed" },
    { value: "98%", label: "Check-in Accuracy" },
    { value: "<2s", label: "Avg Check-in Time" },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Create Your Event",
      description: "Set up your event with venue, date, capacity, and promoter commission structure. Get venue approval if needed.",
    },
    {
      step: "02",
      title: "Invite Your Team",
      description: "Add promoters who get unique tracking links. Each promoter can share their personal invite code with their network.",
    },
    {
      step: "03",
      title: "Guests Register",
      description: "Attendees sign up via magic link—no app download, no password needed. They get their QR pass instantly.",
    },
    {
      step: "04",
      title: "Scan & Track",
      description: "Door staff scan QR codes with any device. Every check-in is attributed to the right promoter automatically.",
    },
  ];

  const testimonial = {
    quote: "CrowdStack eliminated all the spreadsheets and guesswork. Now we know exactly which promoters are delivering and can pay them fairly based on actual check-ins.",
    name: "Jordan Chen",
    role: "Operations Manager",
    company: "Arena Events",
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center border-b border-border-subtle">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-accent-secondary/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-accent-primary/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32 relative z-10">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Badge color="purple" variant="solid" className="mb-4">
                  FOR BUSINESS
                </Badge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted block">
                  Event Management Platform
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl lg:text-6xl font-black tracking-tighter text-primary leading-[0.95]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Run events with{" "}
                <span className="bg-gradient-to-r from-accent-secondary via-accent-primary to-accent-primary bg-clip-text text-transparent">
                  data, not guesswork.
                </span>
              </motion.h1>
              
              <motion.p
                className="text-xl text-secondary leading-relaxed max-w-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                CrowdStack is the operating system for venues, organizers, and promoters—tracking attendance, attribution, payouts, and performance in one place.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Link href="/contact">
                  <motion.button
                    className="group px-6 py-3 text-sm font-bold uppercase tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent-primary/50 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Book a Demo
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
                <Link href="#features">
                  <motion.button
                    className="px-6 py-3 text-sm font-semibold text-primary bg-glass border border-border-subtle rounded-xl transition-all duration-300 hover:bg-active hover:border-accent-primary/30"
                    whileHover={{ scale: 1.02 }}
                  >
                    See All Features
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trusted By */}
              <motion.div
                className="pt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-4">
                  Trusted by
                </p>
                <div className="flex items-center gap-8">
                  {["CLUBHOUSE", "ARENA", "FESTY"].map((name, i) => (
                    <motion.div
                      key={name}
                      className="text-muted font-semibold text-base"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 0.4, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                      whileHover={{ opacity: 1 }}
                    >
                      {name}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Right - Dashboard Preview */}
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ y: y1 }}
            >
              <motion.div
                className="relative rounded-2xl border border-border-subtle bg-glass/50 backdrop-blur-md p-1 shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Dashboard Preview */}
                <div className="rounded-xl bg-glass p-4 space-y-4">
                  {/* Top Card - Live Attendance */}
                  <motion.div
                    className="rounded-xl border border-border-subtle bg-raised backdrop-blur-sm p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-accent-error"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.7, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Live Attendance</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <motion.span
                        className="text-4xl font-black tracking-tighter text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                      >
                        1,248
                      </motion.span>
                      <span className="text-sm text-muted">/ 1,500 CAP</span>
                    </div>
                    <div className="h-2 bg-active rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: "83%" }}
                        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-accent-success font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +12.4%
                      </span>
                      <span className="text-muted">vs last event</span>
                    </div>
                  </motion.div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      className="h-28 rounded-xl border border-border-subtle bg-raised backdrop-blur-sm p-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted mb-2">Check-ins/hr</p>
                      <div className="flex items-end gap-1 h-16">
                        {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-accent-primary to-accent-secondary rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.6, delay: 0.9 + i * 0.1, ease: "easeOut" }}
                          />
                        ))}
                      </div>
                    </motion.div>
                    <motion.div
                      className="h-28 rounded-xl border border-border-subtle bg-raised backdrop-blur-sm p-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted mb-2">Top Promoters</p>
                      <div className="space-y-2">
                        {[
                          { name: "Marcus R.", value: 142 },
                          { name: "Sarah J.", value: 98 },
                          { name: "Alex T.", value: 76 },
                        ].map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-secondary">{p.name}</span>
                            <span className="font-bold text-primary">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Card */}
              <motion.div
                className="absolute -right-4 top-1/4 rounded-xl border border-border-subtle bg-glass/80 backdrop-blur-md p-4 w-56 shadow-xl"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{ y: y2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-accent-warning" />
                  <h3 className="text-sm font-bold text-primary">Promoter Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { rank: "1", name: "Marcus R.", value: "142", badge: "🥇" },
                    { rank: "2", name: "Sarah J.", value: "98", badge: "🥈" },
                  ].map((promoter, i) => (
                    <motion.div
                      key={promoter.name}
                      className="flex items-center gap-2 text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                    >
                      <span>{promoter.badge}</span>
                      <span className="flex-1 text-secondary">{promoter.name}</span>
                      <span className="font-bold text-accent-success">{promoter.value}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-secondary">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="py-24 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block">
              Platform Features
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-4">
              Everything you need to manage your crowd
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              End-to-end tools to streamline operations, track performance, and grow your events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card hover className="h-full">
                  <div className="flex flex-col h-full p-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">{feature.title}</h3>
                    <p className="text-sm text-secondary flex-1">{feature.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-border-subtle relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-secondary/5 to-transparent" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block">
              Simple Process
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-4">
              How it works
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              Get started in minutes. No complex setup required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border-strong to-transparent z-0" />
                )}
                
                <Card className="h-full relative z-10">
                  <div className="p-2">
                    <div className="text-4xl font-black bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-2">{item.title}</h3>
                    <p className="text-sm text-secondary">{item.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Specific Features */}
      <section className="py-24 border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block">
              One Platform, Every Role
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-4">
              Built for everyone in the event ecosystem
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              Whether you're a venue owner, event organizer, or promoter—CrowdStack gives you the tools you need.
            </p>
          </div>

          <div className="space-y-16">
            {Object.entries(roleFeatures).map(([key, role], roleIndex) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <Card className="overflow-hidden">
                  <div className="p-8 lg:p-12">
                    {/* Role Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-8">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white`}>
                        {role.icon}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-primary uppercase tracking-tight">
                          {role.title}
                        </h3>
                        <p className="text-lg text-accent-secondary font-medium">{role.subtitle}</p>
                        <p className="text-secondary mt-2 max-w-2xl">{role.description}</p>
                      </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {role.features.map((feature, featureIndex) => (
                        <motion.div
                          key={feature.title}
                          className="flex gap-4 p-4 rounded-xl bg-raised border border-border-subtle"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: featureIndex * 0.05 }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary flex-shrink-0">
                            {feature.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-primary mb-1">{feature.title}</h4>
                            <p className="text-sm text-secondary">{feature.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 border-t border-border-subtle relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-secondary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="h-12 w-12 mx-auto text-accent-secondary mb-8" />
            <blockquote className="text-2xl md:text-3xl font-medium text-primary leading-relaxed mb-8">
              "{testimonial.quote}"
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-secondary to-accent-primary flex items-center justify-center text-white font-bold">
                {testimonial.name[0]}
              </div>
              <div className="text-left">
                <div className="text-primary font-bold">{testimonial.name}</div>
                <div className="text-secondary text-sm">{testimonial.role}, {testimonial.company}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border-subtle bg-raised/50 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-1/4 w-64 h-64 bg-accent-secondary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              x: [0, 100, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-primary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -50, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-4 block">
              Get Started
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-6">
              Ready to run smarter events?
            </h2>
            <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto">
              Join venues and organizers using CrowdStack to streamline their operations and maximize their potential.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact">
                <motion.button
                  className="group px-8 py-4 text-base font-bold uppercase tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent-primary/30 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Request Demo
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/">
                <motion.button
                  className="px-8 py-4 text-base font-semibold text-primary bg-glass border border-border-subtle rounded-xl transition-all duration-300 hover:bg-active hover:border-accent-primary/30"
                  whileHover={{ scale: 1.02 }}
                >
                  Back to Home
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

