"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Radio, Search, ChevronRight, ExternalLink, MapPin, Plus } from "lucide-react";
import Image from "next/image";
import { CreateDJModal } from "@/components/CreateDJModal";

export default function AdminDJsPage() {
  const [djs, setDJs] = useState<any[]>([]);
  const [filteredDJs, setFilteredDJs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDJs();
  }, []);

  useEffect(() => {
    filterDJs();
  }, [search, djs]);

  const loadDJs = async () => {
    try {
      const response = await fetch("/api/admin/djs");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view DJs.");
        } else {
          alert(`Failed to load DJs: ${errorData.error || response.statusText}`);
        }
        throw new Error(errorData.error || "Failed to load DJs");
      }
      
      const data = await response.json();
      setDJs(data.djs || []);
    } catch (error) {
      console.error("Error loading DJs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDJs = () => {
    let filtered = [...djs];
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (dj) =>
          dj.name?.toLowerCase().includes(searchLower) ||
          dj.handle?.toLowerCase().includes(searchLower) ||
          dj.location?.toLowerCase().includes(searchLower) ||
          dj.email?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredDJs(filtered);
  };

  if (loading) {
    return (
      <Container>
        <Section>
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </Container>
      </Section>
    </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">DJ Management</h1>
              <p className="text-sm text-secondary">
                Manage all DJ profiles
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create DJ Profile
            </Button>
          </div>

          {/* Search */}
          <Card className="!p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                type="text"
                placeholder="Search by name, handle, location, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {filteredDJs.length} of {djs.length} DJs
            </p>
          </div>

          {/* DJs Table */}
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {filteredDJs.length === 0 ? (
                <div className="p-12 text-center">
                  <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {search ? "No DJs found" : "No DJs yet"}
                  </h3>
                  <p className="text-secondary">
                    {search ? "Try adjusting your search" : "DJ profiles will appear here once created"}
                  </p>
                </div>
              ) : (
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DJ</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Genres</TableHead>
                  <TableHead>Mixes</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDJs.map((dj) => (
                  <TableRow key={dj.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {dj.profile_image_url ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={dj.profile_image_url}
                              alt={dj.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {dj.name?.[0]?.toUpperCase() || "D"}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-primary">{dj.name}</div>
                          {dj.email && (
                            <div className="text-sm text-secondary">{dj.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm text-primary font-mono">{dj.handle}</code>
                    </TableCell>
                    <TableCell>
                      {dj.location ? (
                        <div className="flex items-center gap-1 text-secondary">
                          <MapPin className="h-3 w-3" />
                          <span>{dj.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dj.genres && dj.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {dj.genres.slice(0, 2).map((genre: string) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {dj.genres.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dj.genres.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-primary">{dj.mixes_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-primary">{dj.follower_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-secondary text-sm">
                        {new Date(dj.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/djs/${dj.id}`}>
                          <Button variant="primary" size="sm">
                            Manage
                          </Button>
                        </Link>
                        <Link href={`/dj/${dj.handle}`} target="_blank">
                          <Button variant="ghost" size="sm">
                            View
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              )}
            </div>
          </Card>

          {/* Stats Summary */}
          {djs.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Card className="!p-4">
                <div className="text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">Total DJs</p>
                  <p className="text-2xl font-bold text-primary">{djs.length}</p>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">Total Mixes</p>
                  <p className="text-2xl font-bold text-primary">
                    {djs.reduce((sum, dj) => sum + (dj.mixes_count || 0), 0)}
                  </p>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">Total Followers</p>
                  <p className="text-2xl font-bold text-primary">
                    {djs.reduce((sum, dj) => sum + (dj.follower_count || 0), 0)}
                  </p>
                </div>
              </Card>
              <Card className="!p-4">
                <div className="text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">DJs with Mixes</p>
                  <p className="text-2xl font-bold text-primary">
                    {djs.filter((dj) => dj.mixes_count > 0).length}
                  </p>
                </div>
              </Card>
            </div>
          )}

          <CreateDJModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadDJs();
            }}
          />
        </Container>
      </Section>
    </div>
  );
}

