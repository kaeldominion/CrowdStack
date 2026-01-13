"use client";

import { useState, useEffect } from "react";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal, LoadingSpinner, Card } from "@crowdstack/ui";
import { Search, Flag, AlertTriangle, Ban } from "lucide-react";
import type { GuestFlag } from "@/lib/data/flags";

export default function VenueGuestFlagsPage() {
  const [flags, setFlags] = useState<GuestFlag[]>([]);
  const [filteredFlags, setFilteredFlags] = useState<GuestFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  useEffect(() => {
    filterFlags();
  }, [search, flags]);

  const loadFlags = async () => {
    try {
      const response = await fetch("/api/venue/flags");
      if (!response.ok) throw new Error("Failed to load flags");
      const data = await response.json();
      setFlags(data.flags || []);
    } catch (error) {
      console.error("Error loading flags:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterFlags = () => {
    let filtered = [...flags];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (f: any) =>
          f.attendee?.name?.toLowerCase().includes(searchLower) ||
          f.attendee?.email?.toLowerCase().includes(searchLower) ||
          f.attendee?.phone?.includes(search)
      );
    }

    setFilteredFlags(filtered);
  };

  const getStrikeBadge = (strikes: number | null, permanentBan: boolean) => {
    if (permanentBan) {
      return <Badge variant="error">Banned</Badge>;
    }
    if (!strikes || strikes === 0) return null;
    if (strikes === 1) return <Badge variant="warning">1 Strike</Badge>;
    if (strikes === 2) return <Badge variant="warning">2 Strikes</Badge>;
    if (strikes >= 3) return <Badge variant="error">Auto-Banned</Badge>;
    return null;
  };

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
            <Flag className="h-6 w-6 text-[var(--accent-secondary)]" />
            Guest Flags
          </h1>
          <p className="page-description">
            Manage flagged attendees and track strikes
          </p>
        </div>
        <Button onClick={() => setShowFlagModal(true)}>
          <Flag className="h-4 w-4 mr-2" />
          Flag Attendee
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="text-sm text-secondary">
        Showing {filteredFlags.length} flagged attendees
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attendee</TableHead>
                <TableHead>Strikes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Flagged</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-secondary">
                    No flagged attendees
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlags.map((flag: any) => (
                  <TableRow key={flag.id} hover>
                    <TableCell className="font-medium">
                      {flag.attendee?.name || "Unknown"}
                      {flag.attendee?.email && (
                        <div className="text-sm text-secondary">{flag.attendee.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {flag.strike_count || 0}
                        {flag.strike_count >= 3 && (
                          <AlertTriangle className="h-4 w-4 text-error" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStrikeBadge(flag.strike_count, flag.permanent_ban)}</TableCell>
                    <TableCell className="text-sm text-secondary">{flag.reason}</TableCell>
                    <TableCell className="text-sm text-secondary">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-secondary">
                      {flag.expires_at ? new Date(flag.expires_at).toLocaleDateString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
