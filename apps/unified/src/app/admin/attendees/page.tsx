"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal, LoadingSpinner } from "@crowdstack/ui";
import { Users, Search, Download, Plus, Upload, ExternalLink, User, Eye, Phone, Mail, Instagram, Calendar, MapPin, CheckCircle2, X, ChevronRight, Link as LinkIcon } from "lucide-react";
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
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null);
  const [attendeeEvents, setAttendeeEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

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
          a.name?.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone?.includes(search) ||
          a.instagram_handle?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredAttendees(filtered);
  };

  const loadAttendeeEvents = async (attendeeId: string) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/admin/attendees/${attendeeId}/events`);
      if (response.ok) {
        const data = await response.json();
        setAttendeeEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading attendee events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSelectAttendee = (attendee: any) => {
    setSelectedAttendee(attendee);
    setAttendeeEvents([]);
    loadAttendeeEvents(attendee.id);
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading attendees..." />
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Attendee Database</h1>
              <p className="mt-2 text-sm text-secondary">
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

          <div className="mt-4 text-sm text-secondary">
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
                    <TableHead className="text-center">Events</TableHead>
                    <TableHead className="text-center">Check-ins</TableHead>
                    <TableHead className="text-center">Venues</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-secondary">
                        No attendees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendees.map((attendee) => (
                      <TableRow 
                        key={attendee.id} 
                        hover
                        className="cursor-pointer"
                        onClick={() => handleSelectAttendee(attendee)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {attendee.avatar_url ? (
                                <img 
                                  src={attendee.avatar_url} 
                                  alt={attendee.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-white">
                                  {attendee.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{attendee.name} {attendee.surname || ""}</p>
                              {attendee.instagram_handle && (
                                <p className="text-xs text-pink-500">@{attendee.instagram_handle}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {attendee.email && (
                              <div className="text-sm text-secondary">{attendee.email}</div>
                            )}
                            <div className="text-sm text-secondary">{attendee.phone || attendee.whatsapp}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {attendee.user_id ? (
                            <Badge variant="success" className="flex items-center gap-1 w-fit">
                              <LinkIcon className="h-3 w-3" />
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="default">Guest</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{attendee.events_count || 0}</TableCell>
                        <TableCell className="text-center">{attendee.checkins_count || 0}</TableCell>
                        <TableCell className="text-center">{attendee.venues_count || 0}</TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-secondary" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Attendee Profile Modal */}
          <Modal
            isOpen={!!selectedAttendee}
            onClose={() => setSelectedAttendee(null)}
            title="Attendee Profile"
            size="lg"
          >
            {selectedAttendee && (
              <div className="space-y-6">
                {/* Header with Avatar */}
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedAttendee.avatar_url ? (
                      <img 
                        src={selectedAttendee.avatar_url} 
                        alt={selectedAttendee.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {selectedAttendee.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-primary">
                      {selectedAttendee.name} {selectedAttendee.surname || ""}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAttendee.user_id ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          Account Linked
                        </Badge>
                      ) : (
                        <Badge variant="default">Guest (No Account)</Badge>
                      )}
                      <Badge variant="secondary">{selectedAttendee.events_count || 0} Events</Badge>
                      <Badge variant="secondary">{selectedAttendee.checkins_count || 0} Check-ins</Badge>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAttendee.email && (
                      <a 
                        href={`mailto:${selectedAttendee.email}`}
                        className="flex items-center gap-2 text-sm p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Mail className="h-4 w-4 text-secondary" />
                        <span>{selectedAttendee.email}</span>
                      </a>
                    )}
                    {(selectedAttendee.phone || selectedAttendee.whatsapp) && (
                      <a 
                        href={`tel:${selectedAttendee.whatsapp || selectedAttendee.phone}`}
                        className="flex items-center gap-2 text-sm p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-secondary" />
                        <span>{selectedAttendee.whatsapp || selectedAttendee.phone}</span>
                      </a>
                    )}
                    {selectedAttendee.instagram_handle && (
                      <a 
                        href={`https://instagram.com/${selectedAttendee.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span className="text-pink-500">@{selectedAttendee.instagram_handle}</span>
                      </a>
                    )}
                    {selectedAttendee.tiktok_handle && (
                      <div className="flex items-center gap-2 text-sm p-2 rounded bg-white/5">
                        <span className="text-secondary">TikTok:</span>
                        <span>@{selectedAttendee.tiktok_handle}</span>
                      </div>
                    )}
                    {selectedAttendee.date_of_birth && (
                      <div className="flex items-center gap-2 text-sm p-2 rounded bg-white/5">
                        <Calendar className="h-4 w-4 text-secondary" />
                        <span>
                          {new Date(selectedAttendee.date_of_birth).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedAttendee.bio && (
                    <p className="mt-3 text-sm text-secondary p-2 rounded bg-white/5">{selectedAttendee.bio}</p>
                  )}
                </div>

                {/* Linked Account Info */}
                {selectedAttendee.user_id && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-primary mb-3">Linked User Account</p>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-primary">Account ID</p>
                          <p className="text-xs font-mono text-secondary">{selectedAttendee.user_id}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Event History */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Event History</p>
                  {loadingEvents ? (
                    <p className="text-sm text-secondary">Loading events...</p>
                  ) : attendeeEvents.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {attendeeEvents.map((event: any) => (
                        <div 
                          key={event.registration_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-primary truncate">{event.event_name}</p>
                            <p className="text-xs text-secondary">
                              {event.venue_name} • {new Date(event.event_date).toLocaleDateString()}
                            </p>
                          </div>
                          {event.checked_in ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Attended
                            </Badge>
                          ) : (
                            <Badge variant="default">Registered</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-secondary">No events found</p>
                  )}
                </div>

                {/* Account Details */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Record Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-secondary uppercase tracking-wider">Created</p>
                      <p className="text-primary">
                        {new Date(selectedAttendee.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary uppercase tracking-wider">Last Updated</p>
                      <p className="text-primary">
                        {selectedAttendee.updated_at 
                          ? new Date(selectedAttendee.updated_at).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary uppercase tracking-wider">Attendee ID</p>
                      <p className="text-primary font-mono text-xs">{selectedAttendee.id}</p>
                    </div>
                    {selectedAttendee.import_source && (
                      <div>
                        <p className="text-xs font-medium text-secondary uppercase tracking-wider">Import Source</p>
                        <p className="text-primary">{selectedAttendee.import_source}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setSelectedAttendee(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>

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


