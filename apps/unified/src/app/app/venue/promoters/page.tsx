"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, LoadingSpinner } from "@crowdstack/ui";
import {
  Megaphone,
  Search,
  Calendar,
  TrendingUp,
  Ticket,
  Mail,
  Phone,
  Users,
  ChevronRight,
} from "lucide-react";
import { PromoterProfileModal } from "@/components/PromoterProfileModal";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  created_at: string;
  events_count: number;
  referrals_count: number;
  checkins_count: number;
  conversion_rate: number;
  has_direct_assignment: boolean;
  has_indirect_assignment: boolean;
}

export default function VenuePromotersPage() {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPromoter, setSelectedPromoter] = useState<Promoter | null>(null);

  useEffect(() => {
    loadPromoters();
  }, []);

  const loadPromoters = async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const response = await fetch(`/api/venue/promoters?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) throw new Error("Failed to load promoters");
      const data = await response.json();
      setPromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading promoters:", error);
      alert("Failed to load promoters");
    } finally {
      setLoading(false);
    }
  };

  const filteredPromoters = useMemo(() => {
    if (!search) return promoters;
    const searchLower = search.toLowerCase();
    return promoters.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower)
    );
  }, [search, promoters]);

  // Stats
  const stats = useMemo(() => {
    const totalReferrals = promoters.reduce((sum, p) => sum + p.referrals_count, 0);
    const totalCheckins = promoters.reduce((sum, p) => sum + p.checkins_count, 0);
    const avgConversion = promoters.length > 0 
      ? Math.round(promoters.reduce((sum, p) => sum + p.conversion_rate, 0) / promoters.length)
      : 0;
    return { totalReferrals, totalCheckins, avgConversion };
  }, [promoters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-[var(--accent-secondary)]" />
            Promoters
          </h1>
          <p className="page-description">
            Promoters who have worked events at your venue
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2">
        <div className="stat-chip">
          <span className="stat-chip-value">{promoters.length}</span>
          <span className="stat-chip-label">Total</span>
        </div>
        <div className="stat-chip">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="stat-chip-value">{stats.totalReferrals}</span>
          </div>
          <span className="stat-chip-label">Referrals</span>
        </div>
        <div className="stat-chip">
          <div className="flex items-center gap-1">
            <Ticket className="h-4 w-4 text-[var(--accent-success)]" />
            <span className="stat-chip-value">{stats.totalCheckins}</span>
          </div>
          <span className="stat-chip-label">Check-ins</span>
        </div>
        <div className="stat-chip">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-[var(--accent-secondary)]" />
            <span className="stat-chip-value">{stats.avgConversion}%</span>
          </div>
          <span className="stat-chip-label">Avg Conv.</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search promoters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Promoters List */}
      <div className="glass-panel">
        {/* Header */}
        <div className="table-header-row grid-cols-[1fr_1fr_70px_80px_80px_80px_90px_40px]">
          <div>Promoter</div>
          <div>Contact</div>
          <div>Events</div>
          <div>Referrals</div>
          <div>Check-ins</div>
          <div>Conv.</div>
          <div>Type</div>
          <div></div>
        </div>

        {filteredPromoters.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              {promoters.length === 0
                ? "No promoters have worked events at your venue yet"
                : "No promoters match your search"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/50">
            {filteredPromoters.map((promoter) => (
              <div
                key={promoter.id}
                onClick={() => setSelectedPromoter(promoter)}
                className="table-data-row grid-cols-[1fr_1fr_70px_80px_80px_80px_90px_40px] cursor-pointer"
              >
                {/* Promoter */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {promoter.name}
                    </span>
                  </div>
                </div>

                {/* Contact */}
                <div className="min-w-0 space-y-0.5">
                  {promoter.email && (
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 truncate">
                      <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{promoter.email}</span>
                    </div>
                  )}
                  {promoter.phone && (
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {promoter.phone}
                    </div>
                  )}
                </div>

                {/* Events */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{promoter.events_count}</span>
                </div>

                {/* Referrals */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{promoter.referrals_count}</span>
                </div>

                {/* Check-ins */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{promoter.checkins_count}</span>
                </div>

                {/* Conversion */}
                <div className="text-center">
                  <span className={`text-sm font-mono ${
                    promoter.conversion_rate >= 50 ? "text-[var(--accent-success)]" :
                    promoter.conversion_rate >= 25 ? "text-[var(--accent-warning)]" :
                    "text-[var(--text-secondary)]"
                  }`}>
                    {promoter.conversion_rate}%
                  </span>
                </div>

                {/* Assignment Type */}
                <div>
                  {promoter.has_direct_assignment && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded">
                      Direct
                    </span>
                  )}
                  {promoter.has_indirect_assignment && !promoter.has_direct_assignment && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-active)] text-[var(--text-secondary)] rounded">
                      Via Org
                    </span>
                  )}
                  {!promoter.has_direct_assignment && !promoter.has_indirect_assignment && (
                    <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  )}
                </div>

                {/* Action */}
                <div className="flex justify-end">
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="panel-footer">
          {filteredPromoters.length} of {promoters.length} promoters
        </div>
      </div>

      <PromoterProfileModal
        isOpen={!!selectedPromoter}
        onClose={() => setSelectedPromoter(null)}
        promoter={selectedPromoter}
        context="venue"
      />
    </div>
  );
}
