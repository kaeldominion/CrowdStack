"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
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
    if (!user?.email) return;
    setSendingReset(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setPasswordSent(true);
    } catch (error) {
      console.error("Error sending reset:", error);
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 text-white/60">
            Manage your account preferences
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Security */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Security</h2>
                  <p className="text-sm text-white/50">Password and authentication</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-white font-medium">Password</p>
                    <p className="text-sm text-white/50">
                      {user?.app_metadata?.provider === "email" 
                        ? "Set via email login" 
                        : "Logged in via magic link"}
                    </p>
                  </div>
                </div>
                {!passwordSent ? (
                  <button
                    onClick={handlePasswordReset}
                    disabled={sendingReset}
                    className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                  >
                    {sendingReset ? "Sending..." : "Reset Password"}
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-green-400">
                    <Check className="h-4 w-4" />
                    Email sent!
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-white font-medium">Email Address</p>
                    <p className="text-sm text-white/50">{user?.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <Check className="h-4 w-4" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Notifications</h2>
                  <p className="text-sm text-white/50">How you receive updates</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-white/50">Event updates and reminders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-white/40" />
                  <div>
                    <p className="text-white font-medium">SMS Notifications</p>
                    <p className="text-sm text-white/50">Text reminders before events</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-red-400">Sign Out</p>
                  <p className="text-sm text-white/50">
                    {loggingOut ? "Signing out..." : "Sign out of your account"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-400/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
