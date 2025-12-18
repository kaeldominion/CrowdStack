"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Check roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);

      if (userRoles) {
        setRoles(userRoles.map((r: any) => r.role));
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            My Dashboard
          </h1>
          <p className="mt-4 text-white/60">Welcome, {user?.email}</p>
          
          <div className="mt-6">
            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007"}/login?redirect=/admin`}
              className="inline-flex items-center px-4 py-2 bg-[#3B82F6] text-white rounded-md hover:bg-[#3B82F6]/80 transition-colors"
            >
              Go to Admin Dashboard
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">XP Points</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">Upcoming Events</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">Past Events</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
