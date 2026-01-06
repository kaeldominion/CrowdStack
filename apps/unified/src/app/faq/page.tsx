"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Badge } from "@crowdstack/ui";
import { ChevronDown, Mail, HelpCircle, Shield, Calendar, Smartphone, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@crowdstack/ui";

interface FAQItem {
  question: string;
  answer: string;
}

const faqSections = [
  {
    id: "email-verification",
    title: "Email & Verification",
    icon: Mail,
    color: "accent-secondary",
    faqs: [
      {
        question: "I didn't receive my verification code. What should I do?",
        answer: "First, check your junk or spam folder - verification emails often end up there, especially for first-time users. The code is valid for 60 seconds. If you still can't find it, click 'Send new code' to request another one. Make sure you're checking the email address you entered."
      },
      {
        question: "Why did my verification email go to spam?",
        answer: "Some email providers (like Gmail, Outlook, or Yahoo) may filter verification emails to spam folders, especially if this is your first time receiving an email from CrowdStack. After you mark it as 'Not Spam', future emails should arrive in your inbox. You can also add support@crowdstack.app to your contacts to help prevent this."
      },
      {
        question: "How long is my verification code valid?",
        answer: "Verification codes expire after 60 seconds for security reasons. If your code expires, simply click 'Send new code' to receive a fresh one. You can request a new code as many times as needed."
      },
      {
        question: "Can I use a password instead of a verification code?",
        answer: "Yes! If you're having trouble with verification codes, you can click 'Use password instead' during signup or login. You'll need to create a password (minimum 6 characters) if you don't already have one."
      },
      {
        question: "I'm getting 'rate limit exceeded' errors. What does this mean?",
        answer: "This means you've requested too many verification codes in a short period. Please wait a few minutes before requesting another code. This helps prevent spam and protects your account. If you continue to have issues, try using password login instead or contact support@crowdstack.app."
      },
      {
        question: "The verification code says it's invalid. What's wrong?",
        answer: "Make sure you're entering the full 8-digit code exactly as shown in the email. Don't include any spaces or dashes. If the code has expired (after 60 seconds), you'll need to request a new one. Double-check that you're using the most recent code sent to your email."
      }
    ]
  },
  {
    id: "account-setup",
    title: "Account Setup",
    icon: Shield,
    color: "accent-primary",
    faqs: [
      {
        question: "How do I create an account?",
        answer: "You can create an account in two ways: 1) Register for an event - when you sign up for your first event, we'll create your account automatically, or 2) Go to the login page and click 'Sign up' to create an account directly. You'll need to verify your email address to complete the process."
      },
      {
        question: "I forgot my password. How do I reset it?",
        answer: "Go to the login page and click 'Forgot password?' Enter your email address and we'll send you a password reset link. Make sure to check your spam folder if you don't see it. The reset link is valid for 1 hour. If you continue to have issues, contact support@crowdstack.app."
      },
      {
        question: "How do I update my profile information?",
        answer: "After logging in, go to your profile page (click 'Me' in the navigation). You can edit your name, date of birth, gender, WhatsApp number, and Instagram handle. Some information may be required for event registration."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can delete your account by contacting support@crowdstack.app. Please note that deleting your account will remove all your event registrations, passes, and profile data. This action cannot be undone."
      },
      {
        question: "Do I need to verify my email every time I log in?",
        answer: "No, you only need to verify your email when you first create your account. After that, you can log in with your password or use the magic link option. If you're using a new device or browser, you may be asked to verify again for security."
      }
    ]
  },
  {
    id: "event-registration",
    title: "Event Registration",
    icon: Calendar,
    color: "accent-success",
    faqs: [
      {
        question: "How do I register for an event?",
        answer: "Find the event you want to attend (browse events or use a direct link), click 'Register' or 'Get Tickets', and fill out the registration form. You'll need to provide your email, name, and other required information. After submitting, you'll receive a confirmation and your event pass."
      },
      {
        question: "Where can I find my event pass?",
        answer: "After registering, you can find your pass by going to your profile page (click 'Me' in the navigation) and selecting the event. Your pass includes a QR code that you'll need to show at the door. You can also access it directly from the event page."
      },
      {
        question: "What is a QR code pass and how do I use it?",
        answer: "Your QR code pass is your ticket to the event. When you arrive, the door staff will scan the QR code on your phone to check you in. Make sure your phone screen is at full brightness and the QR code is clearly visible. You can access your QR code from your profile or the event page."
      },
      {
        question: "I registered but can't find my pass. What should I do?",
        answer: "Go to your profile page (click 'Me' in the navigation) and look for the event in your registered events list. If you still can't find it, make sure you're logged into the correct account. If the event doesn't appear, contact support@crowdstack.app with your email and the event name."
      },
      {
        question: "Can I register for multiple events?",
        answer: "Yes! You can register for as many events as you like. All your registrations will appear in your profile under 'My Events'. Each event will have its own QR code pass."
      },
      {
        question: "What information do I need to provide when registering?",
        answer: "Typically, you'll need to provide your email, first name, last name, date of birth, gender, and optionally your WhatsApp number and Instagram handle. Some events may require additional information. All required fields will be marked."
      }
    ]
  },
  {
    id: "technical",
    title: "Technical Issues",
    icon: Smartphone,
    color: "accent-warning",
    faqs: [
      {
        question: "The website isn't loading properly. What should I do?",
        answer: "Try these steps: 1) Refresh the page, 2) Clear your browser cache and cookies, 3) Try a different browser (Chrome, Firefox, Safari, or Edge), 4) Check your internet connection, 5) Disable browser extensions that might interfere. If the problem persists, contact support@crowdstack.app."
      },
      {
        question: "Does CrowdStack work on mobile devices?",
        answer: "Yes! CrowdStack is fully optimized for mobile devices. You can register for events, view your passes, and access all features from your smartphone. The QR code scanner works best on mobile devices."
      },
      {
        question: "My QR code won't scan at the door. What's wrong?",
        answer: "Make sure your phone screen is at full brightness and the QR code is clearly visible. Don't zoom in too much - show the full QR code. If you're using a screenshot, make sure it's clear and not blurry. If problems persist, the door staff can manually check you in using your name or email."
      },
      {
        question: "Which browsers are supported?",
        answer: "CrowdStack works best on modern browsers including Chrome, Firefox, Safari, and Edge. Make sure you're using the latest version of your browser for the best experience. Some older browsers may not support all features."
      }
    ]
  },
  {
    id: "general",
    title: "General",
    icon: Globe,
    color: "accent-secondary",
    faqs: [
      {
        question: "What is CrowdStack?",
        answer: "CrowdStack is an event management platform that makes it easy to discover, register for, and attend events. We provide QR code passes, event management tools for venues and organizers, and a seamless experience for attendees."
      },
      {
        question: "Is CrowdStack free to use?",
        answer: "For attendees, CrowdStack is free to use. You can browse events, register, and attend without any cost. Event organizers and venues may have subscription plans. For pricing information, visit our pricing page or contact support@crowdstack.app."
      },
      {
        question: "How do I contact support?",
        answer: "You can reach our support team at support@crowdstack.app. We typically respond within 24 hours. For urgent issues related to event registration or passes, please include your email address and the event name in your message."
      }
    ]
  }
];

export default function FAQPage() {
  const [openSection, setOpenSection] = useState<string | null>("email-verification");
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
    setOpenFAQ(null);
  };

  const toggleFAQ = (faqId: string) => {
    setOpenFAQ(openFAQ === faqId ? null : faqId);
  };

  return (
    <div className="min-h-screen bg-void pt-24 pb-16">
      {/* Noise texture overlay */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "100px 100px",
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <Badge color="purple" variant="solid" className="mb-4">
              HELP & SUPPORT
            </Badge>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary block">
              Frequently Asked Questions
            </span>
          </motion.div>
          
          <h1 className="page-title mb-6">
            How Can We Help?
          </h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto mb-8">
            Find answers to common questions about using CrowdStack, event registration, and account management.
          </p>
          
          {/* Support Contact Card - Modern Glass Design */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            <div className="relative group">
              {/* Animated gradient border */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-secondary via-accent-primary to-accent-secondary rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500" />
              
              <Card className="relative bg-glass/50 backdrop-blur-xl border-border-strong">
                <div className="flex items-center justify-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-xl bg-accent-secondary/20 flex items-center justify-center border border-accent-secondary/30">
                    <Mail className="h-5 w-5 text-accent-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted mb-1">
                      Support
                    </p>
                    <a 
                      href="mailto:support@crowdstack.app" 
                      className="text-accent-secondary hover:text-accent-primary font-semibold transition-colors text-sm"
                    >
                      support@crowdstack.app
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>

        {/* FAQ Sections - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {faqSections.map((section, sectionIndex) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (sectionIndex + 1) }}
                className="group"
              >
                {/* Section Card with Glass Morphism */}
                <div className="relative h-full">
                  {/* Gradient border on hover */}
                  <div className={cn(
                    "absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm",
                    section.color === "accent-secondary" && "bg-gradient-to-br from-accent-secondary/50 to-accent-primary/50",
                    section.color === "accent-primary" && "bg-gradient-to-br from-accent-primary/50 to-accent-secondary/50",
                    section.color === "accent-success" && "bg-gradient-to-br from-accent-success/50 to-accent-secondary/50",
                    section.color === "accent-warning" && "bg-gradient-to-br from-accent-warning/50 to-accent-primary/50",
                  )} />
                  
                  <Card className={cn(
                    "relative h-full overflow-hidden bg-glass/30 backdrop-blur-xl border-border-strong",
                    "transition-all duration-300",
                    isOpen && "border-accent-secondary/30"
                  )}>
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-6 hover:bg-active/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-14 w-14 rounded-xl flex items-center justify-center border transition-all duration-300",
                          section.color === "accent-secondary" && "bg-accent-secondary/20 border-accent-secondary/30",
                          section.color === "accent-primary" && "bg-accent-primary/20 border-accent-primary/30",
                          section.color === "accent-success" && "bg-accent-success/20 border-accent-success/30",
                          section.color === "accent-warning" && "bg-accent-warning/20 border-accent-warning/30",
                          isOpen && "scale-110"
                        )}>
                          <Icon className={cn(
                            "h-7 w-7 transition-colors",
                            section.color === "accent-secondary" && "text-accent-secondary",
                            section.color === "accent-primary" && "text-accent-primary",
                            section.color === "accent-success" && "text-accent-success",
                            section.color === "accent-warning" && "text-accent-warning",
                          )} />
                        </div>
                        <div className="text-left">
                          <h2 className="section-header mb-1">{section.title}</h2>
                          <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted">
                            {section.faqs.length} {section.faqs.length === 1 ? 'FAQ' : 'FAQs'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "h-5 w-5 text-secondary transition-all duration-300",
                          isOpen && "rotate-180 text-accent-secondary"
                        )} 
                      />
                    </button>

                    {/* FAQs - Animated Accordion */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border-subtle divide-y divide-border-subtle">
                            {section.faqs.map((faq, faqIndex) => {
                              const faqId = `${section.id}-${faqIndex}`;
                              const isFAQOpen = openFAQ === faqId;
                              
                              return (
                                <div key={faqId} className="group/faq">
                                  <button
                                    onClick={() => toggleFAQ(faqId)}
                                    className="w-full flex items-start justify-between gap-4 text-left p-5 hover:bg-active/20 transition-all duration-200"
                                  >
                                    <div className="flex-1 flex items-start gap-3">
                                      <HelpCircle className={cn(
                                        "h-4 w-4 mt-0.5 flex-shrink-0 transition-colors",
                                        section.color === "accent-secondary" && "text-accent-secondary/60 group-hover/faq:text-accent-secondary",
                                        section.color === "accent-primary" && "text-accent-primary/60 group-hover/faq:text-accent-primary",
                                        section.color === "accent-success" && "text-accent-success/60 group-hover/faq:text-accent-success",
                                        section.color === "accent-warning" && "text-accent-warning/60 group-hover/faq:text-accent-warning",
                                      )} />
                                      <h3 className={cn(
                                        "font-semibold text-sm leading-snug transition-colors",
                                        isFAQOpen ? "text-primary" : "text-secondary group-hover/faq:text-primary"
                                      )}>
                                        {faq.question}
                                      </h3>
                                    </div>
                                    <ChevronDown 
                                      className={cn(
                                        "h-4 w-4 text-muted transition-all duration-200 flex-shrink-0 mt-0.5",
                                        isFAQOpen && "rotate-180",
                                        section.color === "accent-secondary" && isFAQOpen && "text-accent-secondary",
                                        section.color === "accent-primary" && isFAQOpen && "text-accent-primary",
                                        section.color === "accent-success" && isFAQOpen && "text-accent-success",
                                        section.color === "accent-warning" && isFAQOpen && "text-accent-warning",
                                      )} 
                                    />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {isFAQOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className={cn(
                                          "px-5 pb-5 pl-12 border-l-2",
                                          section.color === "accent-secondary" && "border-accent-secondary/30",
                                          section.color === "accent-primary" && "border-accent-primary/30",
                                          section.color === "accent-success" && "border-accent-success/30",
                                          section.color === "accent-warning" && "border-accent-warning/30",
                                        )}>
                                          <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">
                                            {faq.answer}
                                          </p>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Help Section - Modern CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative group"
        >
          {/* Animated gradient border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary rounded-2xl opacity-0 group-hover:opacity-30 blur transition-opacity duration-500" />
          
          <Card className="relative bg-glass/50 backdrop-blur-xl border-border-strong overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-accent-secondary/5 to-transparent opacity-50" />
            
            <div className="relative p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent-secondary/20 border border-accent-secondary/30 mb-6">
                <Sparkles className="h-8 w-8 text-accent-secondary" />
              </div>
              
              <h3 className="font-sans text-xl font-bold text-primary mb-2">Can't find what you're looking for?</h3>
              <p className="text-sm text-secondary mb-6 max-w-md mx-auto">
                Our support team is here to help. Send us an email and we'll get back to you within 24 hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:support@crowdstack.app"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-secondary to-accent-primary hover:from-accent-secondary/90 hover:to-accent-primary/90 text-void font-semibold transition-all duration-300 hover:scale-105 shadow-lg shadow-accent-secondary/20"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border-strong hover:border-accent-secondary/50 bg-glass/50 hover:bg-active/30 text-primary font-semibold transition-all duration-300"
                >
                  Request a Demo
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
