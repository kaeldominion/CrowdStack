"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import {
  Building2,
  Search,
  Calendar,
  Users,
  Ticket,
  Star,
  ChevronRight,
  Mail,
  Phone,
  UserPlus,
  StarOff,
} from "lucide-react";
import Link from "next/link";
import { AddOrganizerModal } from "@/components/AddOrganizerModal";
import { OrganizerProfileModal } from "@/components/OrganizerProfileModal";

interface Organizer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  events_count: number;
  total_registrations: number;
  total_checkins: number;
  is_preapproved: boolean;
  partnership_id: string | null;
}

export default function VenueOrganizersPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreapprovedOnly, setShowPreapprovedOnly] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);

  useEffect(() => {
    loadOrganizers();
  }, []);

  useEffect(() => {
    filterOrganizers();
  }, [search, organizers, showPreapprovedOnly]);

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/venue/organizers");
      if (!response.ok) throw new Error("Failed to load organizers");
      const data = await response.json();
      setOrganizers(data.organizers || []);
    } catch (error) {
      console.error("Error loading organizers:", error);
      alert("Failed to load organizers");
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizers = () => {
    let filtered = [...organizers];
    
    // Filter by pre-approved status
    if (showPreapprovedOnly) {
      filtered = filtered.filter((o) => o.is_preapproved);
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.name?.toLowerCase().includes(searchLower) ||
          o.email?.toLowerCase().includes(searchLower) ||
          o.company_name?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredOrganizers(filtered);
  };

  const handlePreapprove = async (organizer: Organizer) => {
    try {
      const response = await fetch("/api/venue/organizers/preapproved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizer_id: organizer.id }),
      });
      if (response.ok) {
        loadOrganizers();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to pre-approve organizer");
      }
    } catch (error) {
      alert("Failed to pre-approve organizer");
    }
  };

  const handleRemovePreapproval = async (organizer: Organizer) => {
    if (!confirm("Remove pre-approved status? Their future events will need manual approval.")) {
      return;
    }
    try {
      const response = await fetch(
        `/api/venue/organizers/preapproved?id=${organizer.partnership_id}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        loadOrganizers();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to remove pre-approved status");
      }
    } catch (error) {
      alert("Failed to remove pre-approved status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const preapprovedCount = organizers.filter((o) => o.is_preapproved).length;
  const totalEvents = organizers.reduce((sum, o) => sum + o.events_count, 0);
  const totalRegistrations = organizers.reduce((sum, o) => sum + o.total_registrations, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[var(--accent-secondary)]" />
            Organizers
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Organizers who have created events at your venue
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add Organizer
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2">
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--text-primary)]">{organizers.length}</span>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-lg font-bold text-[var(--text-primary)]">{preapprovedCount}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pre-approved</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-[var(--accent-secondary)]" />
            <span className="text-lg font-bold text-[var(--text-primary)]">{totalEvents}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Events</span>
        </div>
        <div className="px-3 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="text-lg font-bold text-[var(--text-primary)]">{totalRegistrations}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Registrations</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search organizers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-secondary)]"
          />
        </div>
        <button
          onClick={() => setShowPreapprovedOnly(!showPreapprovedOnly)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            showPreapprovedOnly
              ? "bg-[var(--accent-primary)] text-[var(--bg-void)]"
              : "bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          Pre-approved
        </button>
      </div>

      {/* Organizers List */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_100px_140px] gap-2 px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <div>Organizer</div>
          <div>Contact</div>
          <div>Events</div>
          <div>Regs</div>
          <div>Check-ins</div>
          <div>Status</div>
          <div></div>
        </div>

        {filteredOrganizers.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              {organizers.length === 0
                ? "No organizers have created events at your venue yet"
                : "No organizers match your search"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/50">
            {filteredOrganizers.map((organizer) => (
              <div
                key={organizer.id}
                onClick={() => setSelectedOrganizer(organizer)}
                className="grid grid-cols-[1fr_1fr_80px_80px_80px_100px_140px] gap-2 px-3 py-2 hover:bg-[var(--bg-active)] cursor-pointer transition-colors items-center"
              >
                {/* Organizer */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{organizer.name}</span>
                  </div>
                  {organizer.company_name && (
                    <div className="text-[10px] text-[var(--text-muted)] truncate pl-5">
                      {organizer.company_name}
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="min-w-0 space-y-0.5">
                  {organizer.email && (
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 truncate">
                      <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{organizer.email}</span>
                    </div>
                  )}
                  {organizer.phone && (
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {organizer.phone}
                    </div>
                  )}
                </div>

                {/* Events */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{organizer.events_count}</span>
                </div>

                {/* Registrations */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{organizer.total_registrations}</span>
                </div>

                {/* Check-ins */}
                <div className="text-center">
                  <span className="text-sm font-mono text-[var(--text-primary)]">{organizer.total_checkins}</span>
                </div>

                {/* Status */}
                <div>
                  {organizer.is_preapproved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px] font-medium">
                      <Star className="h-2.5 w-2.5 fill-yellow-400" />
                      Pre-approved
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">Standard</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {organizer.is_preapproved ? (
                    <button
                      onClick={() => handleRemovePreapproval(organizer)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--bg-active)] transition-colors"
                      title="Remove pre-approval"
                    >
                      <StarOff className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePreapprove(organizer)}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-yellow-400 hover:bg-[var(--bg-active)] transition-colors"
                      title="Pre-approve"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Link 
                    href={`/app/venue/events?organizer=${organizer.id}`}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-active)] transition-colors"
                    title="View events"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
          <p className="text-[10px] text-[var(--text-muted)] font-mono">
            {filteredOrganizers.length} of {organizers.length} organizers
          </p>
        </div>
      </div>

      <AddOrganizerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={loadOrganizers}
      />

      <OrganizerProfileModal
        isOpen={!!selectedOrganizer}
        onClose={() => setSelectedOrganizer(null)}
        organizer={selectedOrganizer}
        onPreapproveChange={loadOrganizers}
        context="venue"
      />
    </div>
  );
}
