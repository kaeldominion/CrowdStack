"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Zap, 
  QrCode, 
  Trophy, 
  BarChart3,
  ArrowRight,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Activity,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { BentoGrid, BentoCard, MovingBorder } from "@crowdstack/ui";

export default function HomePage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const y2 = useTransform(scrollY, [0, 300], [0, -80]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.5]);

  const features = [
    {
      title: "Fast Signups",
      description: "Optimized forms that convert visitors into attendees in seconds. One-click social login included.",
      icon: <Zap className="h-5 w-5" />,
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      title: "Smart QR Check-in",
      description: "Scan tickets instantly with our lightning-fast entry app. Works offline for reliable entry.",
      icon: <QrCode className="h-5 w-5" />,
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      title: "Promoter Leaderboards",
      description: "Track promoter performance in real-time. Gamify sales with automated rewards and tiers.",
      icon: <Trophy className="h-5 w-5" />,
      gradient: "from-amber-400 to-orange-500",
    },
    {
      title: "Venue Analytics",
      description: "Deep dive into attendance data. Know your peak times, demographics, and spend per head.",
      icon: <BarChart3 className="h-5 w-5" />,
      gradient: "from-emerald-400 to-teal-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"
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
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
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
        </div>

        <div className="mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8 lg:py-40 relative z-10">
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
                <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
                  Event Management Platform
                </span>
              </motion.div>

              <motion.h1
                className="text-6xl font-bold tracking-tighter text-white sm:text-7xl lg:text-8xl leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Run events with{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  data, not guesswork.
                </span>
              </motion.h1>
              
              <motion.p
                className="text-xl text-white/60 leading-relaxed max-w-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                CrowdStack is the operating system for venues, organizers, and promoters — tracking attendance, attribution, payouts, and performance in one place.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Link href="/contact">
                  <motion.button
                    className="px-6 py-3 text-base font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Book a demo
                  </motion.button>
                </Link>
                <Link href="/pricing">
                  <motion.button
                    className="px-6 py-3 text-base font-medium border border-white/10 bg-black/50 backdrop-blur-md text-white rounded-md transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-black/70"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    See how it works
                    <ArrowRight className="inline ml-2 h-4 w-4" />
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
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-4">
                  Trusted by
                </p>
                <div className="flex items-center gap-8">
                  {["CLUBHOUSE", "ARENA", "FESTY"].map((name, i) => (
                    <motion.div
                      key={name}
                      className="text-white/40 font-semibold text-base"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 0.4, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                      whileHover={{ opacity: 1, scale: 1.05 }}
                    >
                      {name}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Right - Dashboard Preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ y: y1, opacity }}
            >
              <motion.div
                className="relative rounded-lg border border-white/10 bg-black/50 backdrop-blur-md p-1"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Monitor Frame */}
                <div className="rounded-md bg-[#0A0A0A] p-4">
                  {/* Top Card - Live Attendance */}
                  <motion.div
                    className="mb-4 rounded-md border border-white/10 bg-black/30 backdrop-blur-sm p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.7, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <span className="text-xs uppercase tracking-widest text-white/60 font-medium">Live Attendance</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <motion.span
                        className="text-3xl font-bold tracking-tighter text-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                      >
                        1,248
                      </motion.span>
                      <span className="text-sm text-white/40">/ 1,500 CAP</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: "83%" }}
                        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <motion.span
                        className="text-emerald-400 font-medium flex items-center gap-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1 }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        +12.4%
                      </motion.span>
                      <span className="text-white/40">vs last event</span>
                    </div>
                  </motion.div>

                  {/* Charts Area - Bento Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <motion.div
                      className="h-32 rounded-md border border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <div className="space-y-2 w-full px-4">
                        {[75, 100, 83, 90].map((width, i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded"
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.8, delay: 0.7 + i * 0.1 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                    <motion.div
                      className="h-32 rounded-md border border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-center"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    >
                      <div className="relative w-16 h-16">
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-white/10"
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                        />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Line Chart */}
                  <motion.div
                    className="h-20 rounded-md border border-white/10 bg-black/30 backdrop-blur-sm mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <div className="h-full p-3 flex items-end gap-1">
                      {[40, 60, 45, 70, 55, 80, 65].map((height, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.6, delay: 0.9 + i * 0.1, ease: "easeOut" }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Floating Promoter Card */}
              <motion.div
                className="absolute -right-4 top-1/4 rounded-md border border-white/10 bg-black/50 backdrop-blur-md p-4 w-64"
                initial={{ opacity: 0, x: 20, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{ y: y2 }}
                whileHover={{ scale: 1.05, borderColor: "rgba(255, 255, 255, 0.2)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold tracking-tight text-white">Promoter Team</h3>
                </div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-4 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Real-time Attribution
                </p>
                <div className="space-y-3">
                  {[
                    { name: "Marcus R.", value: 142, width: 71 },
                    { name: "Sarah J.", value: 98, width: 49 },
                  ].map((promoter, i) => (
                    <motion.div
                      key={promoter.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-white/80">{promoter.name}</span>
                        <span className="text-sm font-semibold text-white">{promoter.value}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${promoter.width}%` }}
                          transition={{ duration: 0.8, delay: 1 + i * 0.2, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-32 relative overflow-hidden">
        {/* Animated background gradient */}
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
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-widest text-white/40 font-medium mb-4 block">
              Platform Features
            </span>
            <h2 className="text-5xl font-bold tracking-tighter text-white mb-6">
              Everything you need to manage your crowd
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Our platform provides the end-to-end tools you need to streamline operations, boost revenue, and understand your audience.
            </p>
          </motion.div>

          {/* Aceternity UI Bento Grid with Moving Borders */}
          <BentoGrid className="md:auto-rows-[20rem]">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <MovingBorder
                  duration={2000}
                  rx="8"
                  ry="8"
                  className="flex h-full"
                >
                  <BentoCard
                    name={feature.title}
                    description={feature.description}
                    icon={
                      <div className={`text-white bg-gradient-to-br ${feature.gradient} p-2 rounded-md`}>
                        {feature.icon}
                      </div>
                    }
                    rows={index === 0 ? 2 : 1}
                    cols={1}
                    className="h-full"
                  />
                </MovingBorder>
              </motion.div>
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-white/10 bg-black/30 backdrop-blur-sm py-32 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"
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
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="text-xs uppercase tracking-widest text-white/40 font-medium mb-4 block"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Get Started
            </motion.span>
            <motion.h2
              className="text-5xl font-bold tracking-tighter text-white mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready to get started?
            </motion.h2>
            <motion.p
              className="text-xl text-white/60 mb-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Join venues and organizers using CrowdStack to streamline their events
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link href="/contact">
                <motion.button
                  className="px-8 py-4 text-base font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Request Demo
                  <motion.div
                    className="inline ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="h-4 w-4 inline" />
                  </motion.div>
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button
                  className="px-8 py-4 text-base font-medium border border-white/10 bg-black/50 backdrop-blur-md text-white rounded-md transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-black/70"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  See Pricing
                  <ArrowRight className="inline ml-2 h-4 w-4" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
