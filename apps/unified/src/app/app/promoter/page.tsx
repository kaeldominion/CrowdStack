"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { EarningsChart } from "@/components/charts/EarningsChart";
import { Button } from "@crowdstack/ui";
import { Ticket, TrendingUp, DollarSign, Trophy, Target, Zap, QrCode, Copy, Check } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

export default function PromoterDashboardPage() {
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    conversionRate: 0,
    totalEarnings: 0,
    rank: 0,
    referrals: 0,
    avgPerEvent: 0,
  });
  const [earningsChartData, setEarningsChartData] = useState<Array<{ date: string; earnings: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStats();
    loadReferralLink();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/promoter/dashboard-stats");
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      setStats(data.stats || stats);
      setEarningsChartData(data.earningsChartData || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferralLink = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promoter } = await supabase
        .from("promoters")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (promoter) {
        const link = `/e/[eventSlug]?ref=${promoter.id}`;
        setReferralLink(link);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
      }
    } catch (error) {
      console.error("Error loading referral link:", error);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-white/60">
          Track your referrals and earnings
        </p>
      </div>

      {/* Wallet Card - QR Code & Referral Link */}
      <BentoCard span={3}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Your Promoter Card</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mb-4" />
              ) : (
                <QrCode className="w-32 h-32 text-white/20 mb-4" />
              )}
              <p className="text-xs text-white/60 text-center">Scan to share your link</p>
            </div>

            {/* Referral Link */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Referral Link</p>
                <div className="flex items-center gap-2 p-3 rounded-md bg-white/5 border border-white/10">
                  <input
                    type="text"
                    value={referralLink || "Loading..."}
                    readOnly
                    className="flex-1 bg-transparent text-white text-sm font-mono"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Scoreboard */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Clicks</p>
              <p className="text-3xl font-bold tracking-tighter text-white">—</p>
            </div>
            <Target className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.referrals}</p>
            </div>
            <Ticket className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Estimated Payout</p>
              <p className="text-3xl font-bold tracking-tighter text-white font-mono">${stats.totalEarnings}</p>
            </div>
            <DollarSign className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Check-ins</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.totalCheckIns}</p>
            </div>
            <Ticket className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Conversion Rate</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.conversionRate}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Leaderboard Rank</p>
              <p className="text-3xl font-bold tracking-tighter text-white">#{stats.rank || "—"}</p>
            </div>
            <Trophy className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>
      </div>

      {/* Earnings Chart */}
      {earningsChartData.length > 0 && (
        <BentoCard span={3}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Earnings Over Time</p>
              <DollarSign className="h-4 w-4 text-white/40" />
            </div>
            <EarningsChart data={earningsChartData} height={250} />
          </div>
        </BentoCard>
      )}
    </div>
  );
}
