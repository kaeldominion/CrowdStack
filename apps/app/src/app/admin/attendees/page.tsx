"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@crowdstack/ui";
import { Users, Search, Download, Plus, Upload, ExternalLink, User, Eye } from "lucide-react";
import { AddAttendeeModal } from "@/components/AddAttendeeModal";
import { ImportCSVModal } from "@/components/ImportCSVModal";
import Link from "next/link";

export default function AdminAttendeesPage() {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadAttendees();
  }, []);

  useEffect(() => {
    filterAttendees();
  }, [search, attendees]);

  const loadAttendees = async () => {
    try {
      const response = await fetch("/api/admin/attendees");
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || []);
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
      <Container>
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading attendees...</div>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Attendee Database</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                Comprehensive view of all attendees across all venues and events
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="secondary" onClick={() => {/* Export CSV */}}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Attendee
              </Button>
            </div>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search attendees by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-foreground-muted">
            Showing {filteredAttendees.length} of {attendees.length} attendees
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Venues</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-foreground-muted">
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
                          {attendee.user_id ? (
                            <div className="space-y-1">
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <User className="h-3 w-3" />
                                Linked
                              </Badge>
                              <div className="text-xs text-foreground-muted font-mono">
                                {attendee.user_id.substring(0, 8)}...
                              </div>
                            </div>
                          ) : (
                            <Badge variant="default">No Account</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>Events: {attendee.events_count || 0}</div>
                            <div>Check-ins: {attendee.checkins_count || 0}</div>
                            <div>Venues: {attendee.venues_count || 0}</div>
                            {attendee.user_info?.has_account && (
                              <div className="pt-1 border-t border-border/50">
                                Account: Linked
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{attendee.events_count || 0}</TableCell>
                        <TableCell>{attendee.checkins_count || 0}</TableCell>
                        <TableCell>{attendee.venues_count || 0}</TableCell>
                        <TableCell className="text-sm text-foreground-muted">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {/* View details */}}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <AddAttendeeModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              loadAttendees();
            }}
          />

          <ImportCSVModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              loadAttendees();
            }}
          />
        </Container>
      </Section>
    </div>
  );
}

