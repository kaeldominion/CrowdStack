"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge, Modal } from "@crowdstack/ui";
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
      <DashboardLayout role="venue_admin" userEmail="">
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading flags...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="venue_admin" userEmail="">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">Guest Flags & Bans</h1>
            <p className="mt-2 text-sm text-white/60">
              Manage flagged attendees and track strikes
            </p>
          </div>
          <Button onClick={() => setShowFlagModal(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Flag Attendee
          </Button>
        </div>

        <Card>
          <div className="p-6">
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
        </Card>

        <div className="text-sm text-white/60">
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
                    <TableCell colSpan={6} className="text-center py-8 text-foreground-muted">
                      No flagged attendees
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFlags.map((flag: any) => (
                    <TableRow key={flag.id} hover>
                      <TableCell className="font-medium">
                        {flag.attendee?.name || "Unknown"}
                        {flag.attendee?.email && (
                          <div className="text-sm text-foreground-muted">{flag.attendee.email}</div>
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
                      <TableCell className="text-sm text-foreground-muted">{flag.reason}</TableCell>
                      <TableCell className="text-sm text-foreground-muted">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-foreground-muted">
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
    </DashboardLayout>
  );
}
