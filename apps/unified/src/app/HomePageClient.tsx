"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { 
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Ticket,
  QrCode, 
  Star,
  ChevronRight,
  Search,
  Zap,
  PartyPopper,
  Music,
  Camera,
  ArrowRight,
  Navigation,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Card, Badge, Button } from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared";

// Lazy load heavy animation components
const EventShowcaseCard = dynamic(() => import("@/components/homepage/EventShowcaseCard").then(mod => ({ default: mod.EventShowcaseCard })), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-raised rounded-2xl animate-pulse" />
});

const HeroEventCarousel = dynamic(() => import("@/components/homepage/HeroEventCarousel").then(mod => ({ default: mod.HeroEventCarousel })), {
  ssr: false,
  loading: () => <div className="w-80 sm:w-96 h-[600px] bg-raised rounded-2xl animate-pulse" />
});

const MobileEventCarousel = dynamic(() => import("@/components/homepage/MobileEventCarousel").then(mod => ({ default: mod.MobileEventCarousel })), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-raised" />
});

interface HomePageClientProps {
  initialEvents: any[];
}

export function HomePageClient({ initialEvents }: HomePageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is already logged in and redirect to /me (non-blocking)
  // Increased delay to avoid blocking initial render and improve perceived performance
  useEffect(() => {
    // Use a longer delay to avoid blocking initial render
    const timer = setTimeout(() => {
      const checkAuth = async () => {
        try {
          const supabase = createBrowserClient();
          const { data: { user }, error } = await supabase.auth.getUser();
          
          // Ignore network errors - user can still browse the site
          if (error && error.message?.includes("fetch failed")) {
            return;
          }
          
          if (user) {
            router.push("/me");
          }
        } catch (error) {
          // Ignore errors - allow user to browse the site
        }
      };
      checkAuth();
    }, 3000); // Increased to 3 seconds to prioritize homepage rendering
    return () => clearTimeout(timer);
  }, [router]);

  // Scroll-based hero fade and blur effect
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.05]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.6], [0, 20]);

  const benefits = [
    {
      icon: <QrCode className="h-6 w-6" />,
      title: "Skip the Queue",
      description: "Instant QR check-in means no waiting. Just scan and you're in.",
    },
    {
      icon: <Ticket className="h-6 w-6" />,
      title: "Your Pass, Your Phone",
      description: "No printed tickets. Your digital pass lives in your pocket.",
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: "Event Photos",
      description: "Get tagged in event photos automatically. Relive the memories.",
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "VIP Treatment",
      description: "Build your profile and unlock exclusive access to premium events.",
    },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Hero Section - Full-Width Event Showcase */}
      <section ref={heroRef} className="relative h-screen">
        {/* Hero Background Image with scroll fade and blur */}
        <motion.div
          className="absolute inset-0 origin-center"
          style={{
            opacity: heroOpacity, 
            scale: heroScale,
          }}
        >
          {/* Inner div for blur effect */}
          <motion.div
            className="absolute inset-0"
            style={{ filter: useTransform(heroBlur, (v) => `blur(${v}px)`) }}
          >
            <Image
              src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop"
              alt="Event atmosphere"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-void via-void/90 to-void/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/50" />
          </motion.div>
        </motion.div>
        
        {/* Bottom fade gradient for seamless transition */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-void via-void/80 to-transparent z-[5] pointer-events-none" />

        {/* Main content */}
        <div className="relative z-10 mx-auto max-w-[1400px] px-8 sm:px-12 lg:px-16 xl:px-20 w-full h-full flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
            
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="mb-6 inline-block">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" />
                  FOR ATTENDEES
            </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6">
                DISCOVER.
                <br />
                <span className="bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent">
                  REGISTER.
                </span>
                <br />
                WALK IN.
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-white/80 max-w-lg mx-auto lg:mx-0 mb-8">
                One profile. Instant QR check-in. No apps, no printed tickets, no waiting in line.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-10">
                <Link href="/browse">
                  <button className="group px-8 py-4 text-sm font-bold uppercase tracking-widest bg-white text-void rounded-xl transition-all duration-300 hover:bg-accent-secondary hover:text-white hover:scale-105 flex items-center gap-2 shadow-xl">
                    <Search className="h-4 w-4" />
                    BROWSE EVENTS
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl transition-all duration-300 hover:bg-white/20 hover:scale-105">
                    I HAVE A PASS
                  </button>
                </Link>
          </div>

              {/* Stats row */}
              <div className="flex items-center justify-center lg:justify-start gap-8">
                {[
                  { value: "50K+", label: "GUESTS" },
                  { value: "<2s", label: "CHECK-IN" },
                  { value: "200+", label: "EVENTS" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/60">{stat.label}</div>
                      </div>
                      ))}
                    </div>
            </div>

            {/* Right: Auto-Rotating Event Cards */}
            {mounted && (
              <div className="hidden lg:flex justify-center lg:justify-end">
                <HeroEventCarousel events={initialEvents} loading={false} />
              </div>
            )}
          </div>
                </div>

        {/* Scrolling BETA Notice Bar */}
        <div className="absolute bottom-24 left-0 right-0 z-20 overflow-hidden">
          <div className="bg-void/80 backdrop-blur-md border-y border-border-subtle py-3">
            <div className="animate-marquee whitespace-nowrap flex items-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center font-mono text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-accent-primary px-6">BETA</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/70 px-6">TESTING IN SHANGHAI, BALI, DUBAI</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white px-6">50K+ GUESTS CHECKED IN</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/70 px-6">&lt;2S AVG CHECK-IN</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white px-6">200+ EVENTS HOSTED</span>
                  <span className="text-white/30">•</span>
                  <Link href="/for-business" className="mx-6">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/50 rounded-full text-accent-primary hover:text-white transition-all duration-200">
                      FOR VENUES & ORGANIZERS
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 hidden lg:flex">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Mobile Event Cards - Scroll-Snap Section */}
      {mounted && (
        <MobileEventCarousel events={initialEvents} loading={false} />
      )}

      {/* How It Works Section */}
      <section className="py-24 border-t border-border-subtle relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-secondary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.span 
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Simple as 1-2-3
            </motion.span>
            <motion.h2 
              className="text-4xl lg:text-5xl font-black tracking-tighter text-primary"
              initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Your night, streamlined
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Find & Register",
                description: "Browse events, find your vibe, and register in seconds with just your phone number.",
                icon: <Search className="h-8 w-8" />,
              },
              {
                step: "02",
                title: "Get Your Pass",
                description: "Receive your unique QR pass instantly. No app download needed—it's all in your browser.",
                icon: <QrCode className="h-8 w-8" />,
              },
              {
                step: "03",
                title: "Walk Right In",
                description: "Show your QR at the door. One scan, you're in. No lines, no waiting, no stress.",
                icon: <Zap className="h-8 w-8" />,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-border-strong via-accent-primary/30 to-transparent z-0" />
                )}
                
                <Card hover className="h-full relative z-10 group">
                  <div className="flex flex-col items-center text-center p-6">
                    <motion.div 
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white mb-6 shadow-lg shadow-accent-primary/30 group-hover:shadow-xl group-hover:shadow-accent-primary/40 transition-shadow duration-500"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {item.icon}
                    </motion.div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-2">
                      Step {item.step}
                    </span>
                    <h3 className="text-xl font-bold text-primary mb-3">{item.title}</h3>
                    <p className="text-sm text-secondary leading-relaxed">{item.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.span 
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Why CrowdStack
            </motion.span>
            <motion.h2 
              className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Made for people who love going out
            </motion.h2>
            <motion.p 
              className="text-xl text-secondary max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              We've reimagined every step of the event experience to make your night smoother.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card hover className="h-full group">
                  <div className="flex flex-col h-full p-2">
                    <motion.div 
                      className="w-14 h-14 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center text-accent-secondary mb-4 group-hover:bg-accent-secondary/20 transition-colors duration-500"
                      whileHover={{ rotate: 10 }}
                    >
                      {benefit.icon}
                    </motion.div>
                    <h3 className="text-lg font-bold text-primary mb-2">{benefit.title}</h3>
                    <p className="text-sm text-secondary flex-1">{benefit.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
                </div>
              </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-b border-border-subtle bg-raised/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "50K+", label: "Happy Guests" },
              { value: "200+", label: "Events" },
              { value: "98%", label: "Check-in Rate" },
              { value: "<2s", label: "Check-in Time" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <motion.div 
                  className="text-4xl md:text-5xl font-black bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent mb-2"
                  whileInView={{ scale: [0.8, 1.1, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {stat.value}
                </motion.div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-primary/10 rounded-full blur-3xl"
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

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 relative z-10">
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4 block">
              Ready to experience the difference?
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary mb-6">
              Your next great night
              <br />
              <span className="bg-gradient-to-r from-accent-secondary to-accent-primary bg-clip-text text-transparent">
                starts here
              </span>
            </h2>
            <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto">
              Join thousands of people who've upgraded their event experience. 
              No apps to download, no passwords to remember.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/browse">
                <motion.button
                  className="group px-8 py-4 text-base font-bold uppercase tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-accent-primary/30 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="h-5 w-5" />
                  Browse Events
                </motion.button>
              </Link>
            </div>
            </motion.div>
        </div>
      </section>

      {/* For Business Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-void to-accent-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 mb-6">
              <span className="text-yellow-400">🏢</span>
              <span className="text-sm font-semibold text-white">For Venues, Organizers & Promoters</span>
        </div>

            {/* Heading */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Run events with{" "}
              <span className="bg-gradient-to-r from-accent-primary via-purple-400 to-accent-secondary bg-clip-text text-transparent">
                data, not guesswork
            </span>
            </h2>
            
            {/* Description */}
            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              The complete operating system for modern events. Track attendance, manage door lists, handle payouts, and grow your audience—all in one place.
            </p>
            
            {/* Features row */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {[
                { icon: "📊", text: "Real-time analytics" },
                { icon: "🎫", text: "QR check-in" },
                { icon: "💰", text: "Automated payouts" },
                { icon: "📱", text: "No app required" },
              ].map((feature) => (
                <div key={feature.text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span>{feature.icon}</span>
                  <span className="text-sm text-white/80">{feature.text}</span>
                </div>
              ))}
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/for-business">
                <motion.button
                  className="px-8 py-4 text-base font-bold uppercase tracking-wider bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent-primary/30 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Explore for Business
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button
                  className="px-8 py-4 text-base font-semibold uppercase tracking-wider text-white bg-white/10 border border-white/20 rounded-xl transition-all duration-300 hover:bg-white/20 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                >
                  Book a Demo
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

