"use client";

import { useState, useEffect } from "react";
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@crowdstack/ui";
import { Search, Download, User, TrendingUp } from "lucide-react";
import type { PromoterAttendee } from "@/lib/data/attendees-promoter";

export default function PromoterAttendeesPage() {
  const [attendees, setAttendees] = useState<PromoterAttendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<PromoterAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"referrals" | "upcoming" | "all">("all");

  useEffect(() => {
    loadAttendees();
  }, [category]);

  useEffect(() => {
    filterAttendees();
  }, [search, attendees]);

  const loadAttendees = async () => {
    try {
      const url = new URL("/api/promoter/attendees", window.location.origin);
      if (category !== "all") {
        url.searchParams.set("category", category);
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data);
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone.includes(search)
      );
    }

    setFilteredAttendees(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">My Attendees</h1>
          <p className="mt-2 text-sm text-white/60">
            People who registered through your referrals or are signed up for upcoming events
          </p>
        </div>
        <Button variant="secondary" onClick={() => {/* Export CSV */}}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="referrals">My Referrals</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Signups</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </Card>

      <div className="text-sm text-white/60">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Upcoming</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-foreground-muted">
                    No attendees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id} hover>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {attendee.email && (
                          <div className="text-sm text-foreground-muted">{attendee.email}</div>
                        )}
                        <div className="text-sm text-foreground-muted">{attendee.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {attendee.referral_count > 0 && (
                        <Badge variant="success">{attendee.referral_count}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendee.upcoming_signups > 0 && (
                        <Badge variant="primary">{attendee.upcoming_signups}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{attendee.total_check_ins}</TableCell>
                    <TableCell className="text-sm text-foreground-muted">
                      {attendee.last_event_at
                        ? new Date(attendee.last_event_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => {/* View details */}}>
                        View
                      </Button>
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
