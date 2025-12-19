"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal } from "@crowdstack/ui";
import { Users, Search, ChevronRight, X } from "lucide-react";

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<any[]>([]);
  const [filteredPromoters, setFilteredPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPromoter, setSelectedPromoter] = useState<any | null>(null);

  useEffect(() => {
    loadPromoters();
  }, []);

  useEffect(() => {
    filterPromoters();
  }, [search, promoters]);

  const loadPromoters = async () => {
    try {
      const response = await fetch("/api/admin/promoters");
      if (!response.ok) throw new Error("Failed to load promoters");
      const data = await response.json();
      setPromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading promoters:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPromoters = () => {
    let filtered = [...promoters];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.phone?.includes(search)
      );
    }
    setFilteredPromoters(filtered);
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading promoters...</div>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Promoter Management</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              View all promoters and their performance metrics
            </p>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search promoters by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-foreground-muted">
            Showing {filteredPromoters.length} of {promoters.length} promoters
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Total Referrals</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromoters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-foreground-muted">
                        No promoters found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPromoters.map((promoter) => (
                      <TableRow 
                        key={promoter.id} 
                        hover
                        className="cursor-pointer"
                        onClick={() => setSelectedPromoter(promoter)}
                      >
                        <TableCell className="font-medium">{promoter.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {promoter.email && (
                              <div className="text-sm text-foreground-muted">{promoter.email}</div>
                            )}
                            {promoter.phone && (
                              <div className="text-sm text-foreground-muted">{promoter.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{promoter.parent?.name || "—"}</TableCell>
                        <TableCell>{promoter.events_count || 0}</TableCell>
                        <TableCell>{promoter.total_referrals || 0}</TableCell>
                        <TableCell className="text-sm text-foreground-muted">
                          {new Date(promoter.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-foreground-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Promoter Detail Modal */}
          <Modal
            isOpen={!!selectedPromoter}
            onClose={() => setSelectedPromoter(null)}
            title="Promoter Details"
            size="md"
          >
            {selectedPromoter && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedPromoter.name}</h3>
                  {selectedPromoter.parent?.name && (
                    <p className="text-sm text-foreground-muted">
                      Parent: {selectedPromoter.parent.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Email</p>
                    <p className="text-sm text-foreground">{selectedPromoter.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-foreground">{selectedPromoter.phone || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Events</p>
                    <p className="text-sm text-foreground">{selectedPromoter.events_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Total Referrals</p>
                    <p className="text-sm text-foreground">{selectedPromoter.total_referrals || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Created</p>
                  <p className="text-sm text-foreground">
                    {new Date(selectedPromoter.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setSelectedPromoter(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </Container>
      </Section>
    </div>
  );
}

