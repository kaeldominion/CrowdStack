"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

// Sample event data for showcase
const SHOWCASE_EVENTS = [
  {
    id: "1",
    name: "Friday Night Sessions",
    slug: "friday-night-sessions",
    date: "SAT 28 DEC",
    time: "22:00",
    venue: "Jade by Todd English",
    city: "Dubai",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
    spotsLeft: 45,
    capacity: 200,
  },
  {
    id: "2",
    name: "Techno Underground",
    slug: "techno-underground",
    date: "SUN 29 DEC",
    time: "23:00",
    venue: "Warehouse 51",
    city: "Los Angeles",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=800&fit=crop",
    spotsLeft: 12,
    capacity: 150,
  },
  {
    id: "3",
    name: "New Year's Eve Gala",
    slug: "nye-gala",
    date: "TUE 31 DEC",
    time: "21:00",
    venue: "The Grand Ballroom",
    city: "New York",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=800&fit=crop",
    spotsLeft: 89,
    capacity: 500,
  },
  {
    id: "4",
    name: "Sunset Rooftop Party",
    slug: "sunset-rooftop",
    date: "FRI 3 JAN",
    time: "18:00",
    venue: "Sky Lounge",
    city: "Miami",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=800&fit=crop",
    spotsLeft: 28,
    capacity: 100,
  },
];

// Sample venue data
const SHOWCASE_VENUES = [
  {
    id: "1",
    name: "Jade by Todd English",
    slug: "jade-by-todd-english",
    city: "Dubai",
    country: "UAE",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop",
    rating: 4.8,
    tags: ["House", "Upscale"],
  },
  {
    id: "2",
    name: "Warehouse 51",
    slug: "warehouse-51",
    city: "Los Angeles",
    country: "USA",
    image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&h=400&fit=crop",
    rating: 4.6,
    tags: ["Techno", "Underground"],
  },
  {
    id: "3",
    name: "The Grand Ballroom",
    slug: "grand-ballroom",
    city: "New York",
    country: "USA",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&h=400&fit=crop",
    rating: 4.9,
    tags: ["Exclusive", "Formal"],
  },
  {
    id: "4",
    name: "Sky Lounge",
    slug: "sky-lounge",
    city: "Miami",
    country: "USA",
    image: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&h=400&fit=crop",
    rating: 4.7,
    tags: ["Rooftop", "Beach"],
  },
];

// Event Card Component (simplified version for landing)
function EventShowcaseCard({ event, index }: { event: typeof SHOWCASE_EVENTS[0]; index: number }) {
  return (
          <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={`/e/${event.slug}`}>
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle hover:border-accent-primary/50 transition-all duration-500 shadow-soft hover:shadow-xl hover:shadow-accent-primary/10">
          {/* Image */}
          <div className="relative aspect-[3/4] min-h-[380px]">
            <img
              src={event.image}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Floating badge */}
            <motion.div
              className="absolute top-4 left-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
            >
              <Badge 
                color="purple" 
                variant="solid" 
                className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold backdrop-blur-sm"
              >
                {event.spotsLeft <= 20 ? "SELLING FAST" : "FEATURED"}
              </Badge>
              </motion.div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
              {/* Date & Time */}
              <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider">
                {event.date} • {event.time}
              </p>
              
              {/* Event Name */}
              <h3 className="font-sans text-2xl font-black text-primary uppercase tracking-tight leading-tight group-hover:text-white transition-colors duration-300">
                {event.name}
              </h3>
              
              {/* Venue */}
              <div className="flex items-center gap-1.5 text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">@ {event.venue}, {event.city}</span>
              </div>
              
              {/* Spots left */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  event.spotsLeft <= 20 ? "text-accent-warning" : "text-accent-success"
                }`}>
                  {event.spotsLeft} spots left
                </span>
                <span className="text-xs text-muted">
                  {event.capacity} capacity
                </span>
              </div>
              
              {/* CTA Button */}
                  <motion.button
                className="w-full bg-white text-void font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-accent-secondary hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Join Guestlist
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </motion.button>
            </div>
          </div>
        </div>
                </Link>
              </motion.div>
  );
}

// Mobile Event Carousel - scroll-snap through events
function MobileEventCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const events = [
    {
      id: "1",
      name: "NEW YEAR'S EVE GALA",
      date: "TONIGHT • 22:00",
      venue: "@ The Grand Ballroom, NYC",
      attending: 342,
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=800&fit=crop",
      badge: { text: "LIVE NOW", color: "green" as const },
    },
    {
      id: "2",
      name: "TECHNO UNDERGROUND",
      date: "SAT 28 DEC • 23:00",
      venue: "@ Warehouse 51, LA",
      attending: 189,
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=800&fit=crop",
      badge: { text: "SELLING FAST", color: "purple" as const },
    },
    {
      id: "3",
      name: "ROOFTOP SUNSET",
      date: "SUN 29 DEC • 18:00",
      venue: "@ Sky Lounge, Miami",
      attending: 256,
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=800&fit=crop",
      badge: { text: "FEATURED", color: "blue" as const },
    },
  ];

  // Handle scroll to detect active card
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const cardWidth = containerRef.current.offsetWidth;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, events.length - 1));
  };

  return (
    <section className="lg:hidden bg-void py-8">
      {/* Section Header */}
      <div className="px-6 mb-6">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-2 block">
          Happening Now
        </span>
        <h2 className="text-2xl font-black text-white">Featured Events</h2>
                </div>

      {/* Scroll-snap container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 gap-4 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((event, index) => (
          <div 
            key={event.id}
            className="snap-center shrink-0 w-[85vw] max-w-[340px]"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl">
              <div className="relative aspect-[3/4]">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                
                {/* Badge */}
                <div className="absolute top-4 left-4">
                  <Badge 
                    color={event.badge.color} 
                    variant="solid" 
                    className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold"
                  >
                    {event.badge.color === "green" && (
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse inline-block" />
                    )}
                    {event.badge.text}
                  </Badge>
                      </div>
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider mb-2">
                    {event.date}
                  </p>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                    {event.name}
                  </h3>
                  <p className="text-sm text-white/70 mb-4">
                    {event.venue}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-accent-success font-medium">{event.attending} attending</span>
                    <button className="px-5 py-2.5 bg-white text-void text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-accent-secondary hover:text-white transition-colors">
                      Join
                    </button>
                    </div>
                    </div>
                    </div>
                    </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {events.map((_, i) => (
          <div
                            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex 
                ? "bg-white w-6" 
                : "bg-white/30 w-2"
            }`}
                          />
                        ))}
                      </div>

      {/* Swipe hint */}
      <p className="text-center text-white/40 text-xs font-mono uppercase tracking-widest mt-4">
        Swipe to explore
      </p>
    </section>
  );
}

// Hero Event Carousel - auto-rotating through featured events
function HeroEventCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const heroEvents = [
    {
      id: "1",
      name: "NEW YEAR'S EVE GALA",
      date: "TONIGHT • 22:00",
      venue: "@ The Grand Ballroom, NYC",
      attending: 342,
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=800&fit=crop",
      badge: { text: "LIVE NOW", color: "green" as const },
    },
    {
      id: "2",
      name: "TECHNO UNDERGROUND",
      date: "SAT 28 DEC • 23:00",
      venue: "@ Warehouse 51, LA",
      attending: 189,
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=800&fit=crop",
      badge: { text: "SELLING FAST", color: "purple" as const },
    },
    {
      id: "3",
      name: "ROOFTOP SUNSET",
      date: "SUN 29 DEC • 18:00",
      venue: "@ Sky Lounge, Miami",
      attending: 256,
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=800&fit=crop",
      badge: { text: "FEATURED", color: "blue" as const },
    },
  ];

  // Auto-rotate every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroEvents.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroEvents.length]);

  const currentEvent = heroEvents[currentIndex];

  return (
    <div className="relative">
      {/* Main card - larger size */}
                    <motion.div
        key={currentEvent.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-80 sm:w-96 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/50 hover:scale-[1.02] transition-transform duration-300"
      >
        <div className="relative aspect-[3/4]">
          <motion.img
            key={currentEvent.image}
            src={currentEvent.image}
            alt={currentEvent.name}
            className="w-full h-full object-cover"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
          
          {/* Badge */}
          <div className="absolute top-5 left-5">
            <Badge color={currentEvent.badge.color} variant="solid" className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold">
              {currentEvent.badge.color === "green" && (
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse inline-block" />
              )}
              {currentEvent.badge.text}
            </Badge>
                  </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
                  <motion.div
              key={`content-${currentEvent.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider mb-2">
                {currentEvent.date}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
                {currentEvent.name}
              </h3>
              <p className="text-sm text-white/70 mb-5">
                {currentEvent.venue}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-accent-success font-medium">{currentEvent.attending} attending</span>
                <button className="px-5 py-2.5 bg-white text-void text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-accent-secondary hover:text-white transition-colors">
                  Join
                </button>
                    </div>
                  </motion.div>
          </div>
                </div>
              </motion.div>

      {/* Carousel indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {heroEvents.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex 
                ? "bg-white w-6" 
                : "bg-white/40 w-2"
            }`}
          />
        ))}
                </div>
                      </div>
  );
}

// Venue Card Component (simplified version for landing)
function VenueShowcaseCard({ venue, index }: { venue: typeof SHOWCASE_VENUES[0]; index: number }) {
  return (
                        <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <Link href={`/v/${venue.slug}`}>
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle hover:border-accent-secondary/50 transition-all duration-500 shadow-soft hover:shadow-lg bg-glass">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={venue.image}
              alt={venue.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
            
            {/* Rating badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-void/80 backdrop-blur-sm border border-border-subtle">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-primary">{venue.rating}</span>
                      </div>
                </div>
          
          {/* Content */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-sans text-lg font-bold text-primary group-hover:text-accent-secondary transition-colors duration-300">
                {venue.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">{venue.city}, {venue.country}</span>
          </div>
        </div>
            
            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {venue.tags.map((tag, i) => (
                <Badge 
                  key={i}
                  color="blue" 
                  variant="outline" 
                  className="!rounded-full !px-2.5 !py-0.5 !text-[9px] !font-bold !uppercase !tracking-wider"
                >
                  {tag}
                </Badge>
            ))}
          </div>
        </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is already logged in and redirect to /me
  useEffect(() => {
    const checkAuth = async () => {
      try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/me");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };
    const timer = setTimeout(() => {
    checkAuth();
    }, 100);
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
            <img 
              src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&h=1080&fit=crop"
              alt="Event atmosphere"
              className="w-full h-full object-cover"
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
            <div className="hidden lg:flex justify-center lg:justify-end">
              <HeroEventCarousel />
            </div>
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
      <MobileEventCarousel />

      {/* Popular Venues Section */}
      <section className="py-24 relative overflow-hidden -mt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-accent-secondary/5 to-transparent pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-2 block">
                Top Destinations
            </span>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary">
                Popular Venues
            </h2>
          </div>
            <Link href="/browse">
              <motion.button
                className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1 group"
                whileHover={{ x: 5 }}
              >
                Explore venues
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Venues Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SHOWCASE_VENUES.map((venue, index) => (
              <VenueShowcaseCard key={venue.id} venue={venue} index={index} />
            ))}
          </div>
        </div>
      </section>

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

      {/* Custom CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
