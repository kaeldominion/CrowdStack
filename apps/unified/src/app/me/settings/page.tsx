"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner } from "@crowdstack/ui";
import {
  Shield,
  Bell,
  Mail,
  Smartphone,
  LogOut,
  Key,
  Check,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setResetError("No email address found. Please contact support.");
      return;
    }
    
    setSendingReset(true);
    setResetError(null);
    setPasswordSent(false);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setPasswordSent(true);
    } catch (error: any) {
      console.error("Error sending reset:", error);
      setResetError(error?.message || "Failed to send password reset email. Please try again.");
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading settings..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Settings
          </h1>
          <p className="mt-2 text-secondary">
            Manage your account preferences
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Security */}
          <div className="rounded-2xl border border-border-subtle bg-glass/5 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent-secondary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-accent-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">Security</h2>
                  <p className="text-sm text-muted">Password and authentication</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Password */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-glass/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted" />
                    <div>
                      <p className="text-primary font-medium">Password</p>
                      <p className="text-sm text-muted">
                        {user?.app_metadata?.provider === "email" 
                          ? "Set via email login" 
                          : "Logged in via magic link"}
                      </p>
                    </div>
                  </div>
                  {!passwordSent ? (
                    <button
                      onClick={handlePasswordReset}
                      disabled={sendingReset || !user?.email}
                      className="px-4 py-2 text-sm font-medium text-accent-secondary hover:text-accent-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReset ? "Sending..." : "Reset Password"}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-accent-success">
                      <Check className="h-4 w-4" />
                      Email sent!
                    </span>
                  )}
                </div>
                {resetError && (
                  <div className="flex items-start gap-2 p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-accent-error mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-accent-error">{resetError}</p>
                  </div>
                )}
                {passwordSent && (
                  <div className="flex items-start gap-2 p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg">
                    <Check className="h-4 w-4 text-accent-success mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-accent-success">
                      <p className="font-medium">Password reset email sent!</p>
                      <p className="mt-1 text-accent-success/80">
                        Check your email ({user?.email}) for instructions to reset your password.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-4 bg-glass/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-primary font-medium">Email Address</p>
                    <p className="text-sm text-muted">{user?.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm text-accent-success">
                  <Check className="h-4 w-4" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-border-subtle bg-glass/5 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-accent-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">Notifications</h2>
                  <p className="text-sm text-muted">How you receive updates</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-glass/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-primary font-medium">Email Notifications</p>
                    <p className="text-sm text-muted">Event updates and reminders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-active peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-secondary"></div>
                </label>
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between p-4 bg-glass/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted" />
                  <div>
                    <p className="text-primary font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted">Text reminders before events</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-active peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-secondary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="rounded-2xl border border-accent-error/20 bg-accent-error/5 overflow-hidden">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-accent-error/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent-error/20 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-accent-error" />
                </div>
                <div>
                  <p className="text-lg font-medium text-accent-error">Sign Out</p>
                  <p className="text-sm text-muted">
                    {loggingOut ? "Signing out..." : "Sign out of your account"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-accent-error/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
