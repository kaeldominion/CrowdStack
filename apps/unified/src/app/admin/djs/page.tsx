"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner, Modal } from "@crowdstack/ui";
import { Radio, Search, ChevronRight, ExternalLink, MapPin, Plus, Loader2, Trash2, GitMerge, CheckSquare, Square, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { CreateDJModal } from "@/components/CreateDJModal";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminDJsPage() {
  const [djs, setDJs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Selection mode for merge/delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDjs, setSelectedDjs] = useState<Set<string>>(new Set());

  // Merge modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [primaryDjId, setPrimaryDjId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [djToDelete, setDjToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteRequiresForce, setDeleteRequiresForce] = useState<{ lineupCount: number; followerCount: number } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when search changes
  useEffect(() => {
    setDJs([]);
    setPagination(null);
    setLoading(true);
    loadDJs(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadDJs = async (page: number = 1, searchQuery: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/admin/djs?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
        } else if (response.status === 403) {
          alert("Access denied. You need superadmin role to view DJs.");
        }
        throw new Error(errorData.error || "Failed to load DJs");
      }

      const data = await response.json();

      if (page === 1) {
        setDJs(data.djs || []);
      } else {
        setDJs(prev => [...prev, ...(data.djs || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading DJs:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadDJs(pagination.page + 1, debouncedSearch);
  }, [loadingMore, pagination, debouncedSearch]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination, loadingMore, loadMore]);

  // Toggle DJ selection
  const toggleSelection = (djId: string) => {
    setSelectedDjs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(djId)) {
        newSet.delete(djId);
      } else {
        newSet.add(djId);
      }
      return newSet;
    });
  };

  // Handle merge
  const handleMerge = async () => {
    if (!primaryDjId || selectedDjs.size < 2) return;

    const mergeDjIds = Array.from(selectedDjs).filter(id => id !== primaryDjId);

    setMerging(true);
    try {
      const response = await fetch("/api/admin/djs/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryDjId, mergeDjIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to merge DJs");
      }

      alert(`Successfully merged ${data.stats.djsDeleted} DJ(s) into ${data.primaryDj.name}`);

      // Reset state and reload
      setShowMergeModal(false);
      setSelectionMode(false);
      setSelectedDjs(new Set());
      setPrimaryDjId(null);
      setDJs([]);
      setPagination(null);
      setLoading(true);
      loadDJs(1, debouncedSearch);
    } catch (error: any) {
      alert(error.message || "Failed to merge DJs");
    } finally {
      setMerging(false);
    }
  };

  // Handle delete
  const handleDelete = async (force: boolean = false) => {
    if (!djToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/djs/${djToDelete.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.status === 409 && data.requiresForce) {
        setDeleteRequiresForce(data.details);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete DJ");
      }

      alert(`Successfully deleted DJ: ${djToDelete.name}`);

      // Reset state and reload
      setShowDeleteModal(false);
      setDjToDelete(null);
      setDeleteRequiresForce(null);
      setDeleteForce(false);
      setDJs([]);
      setPagination(null);
      setLoading(true);
      loadDJs(1, debouncedSearch);
    } catch (error: any) {
      alert(error.message || "Failed to delete DJ");
    } finally {
      setDeleting(false);
    }
  };

  // Get selected DJs data
  const selectedDjsData = djs.filter(dj => selectedDjs.has(dj.id));

  if (loading) {
    return (
      <Container>
        <Section>
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </Section>
      </Container>
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
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <span className="text-sm text-secondary mr-2">
                    {selectedDjs.size} selected
                  </span>
                  {selectedDjs.size >= 2 && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowMergeModal(true)}
                    >
                      <GitMerge className="h-4 w-4 mr-2" />
                      Merge Selected
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedDjs(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectionMode(true)}
                  >
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge DJs
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create DJ
                  </Button>
                </>
              )}
            </div>
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
              Showing {djs.length} of {pagination?.total || 0} DJs
              {debouncedSearch && ` matching "${debouncedSearch}"`}
            </p>
          </div>

          {/* DJs Table */}
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {djs.length === 0 && !loading ? (
                <div className="p-12 text-center">
                  <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {debouncedSearch ? "No DJs found" : "No DJs yet"}
                  </h3>
                  <p className="text-secondary">
                    {debouncedSearch ? "Try adjusting your search" : "DJ profiles will appear here once created"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectionMode && <TableHead className="w-10"></TableHead>}
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
                    {djs.map((dj) => (
                      <TableRow key={dj.id} className={selectedDjs.has(dj.id) ? "bg-accent-secondary/10" : ""}>
                        {selectionMode && (
                          <TableCell>
                            <button
                              onClick={() => toggleSelection(dj.id)}
                              className="p-1 hover:bg-white/10 rounded"
                            >
                              {selectedDjs.has(dj.id) ? (
                                <CheckSquare className="h-5 w-5 text-accent-secondary" />
                              ) : (
                                <Square className="h-5 w-5 text-secondary" />
                              )}
                            </button>
                          </TableCell>
                        )}
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
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setDjToDelete(dj);
                                setShowDeleteModal(true);
                                setDeleteRequiresForce(null);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          {/* Infinite Scroll Trigger */}
          <div
            ref={loadMoreRef}
            className="py-8 flex items-center justify-center"
          >
            {loadingMore && (
              <div className="flex items-center gap-2 text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading more DJs...</span>
              </div>
            )}
            {!loadingMore && pagination?.hasMore && (
              <Button variant="ghost" onClick={loadMore}>
                Load More
              </Button>
            )}
            {!pagination?.hasMore && djs.length > 0 && (
              <p className="text-sm text-secondary">
                All {pagination?.total || djs.length} DJs loaded
              </p>
            )}
          </div>

          {/* Stats Summary */}
          {djs.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Card className="!p-4">
                <div className="text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">Total DJs</p>
                  <p className="text-2xl font-bold text-primary">{pagination?.total || djs.length}</p>
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
              setDJs([]);
              setPagination(null);
              setLoading(true);
              loadDJs(1, debouncedSearch);
            }}
          />

          {/* Merge Modal */}
          <Modal
            isOpen={showMergeModal}
            onClose={() => {
              setShowMergeModal(false);
              setPrimaryDjId(null);
            }}
            title="Merge DJ Profiles"
            size="lg"
          >
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Select the primary DJ profile. All other selected DJs will be merged into this one.
                Their lineups and followers will be transferred.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary mb-2">
                  Select Primary DJ
                </label>
                {selectedDjsData.map(dj => (
                  <button
                    key={dj.id}
                    onClick={() => setPrimaryDjId(dj.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      primaryDjId === dj.id
                        ? "border-accent-secondary bg-accent-secondary/10"
                        : "border-border-subtle hover:bg-white/5"
                    }`}
                  >
                    {dj.profile_image_url ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={dj.profile_image_url} alt={dj.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {dj.name?.[0]?.toUpperCase() || "D"}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-primary">{dj.name}</div>
                      <div className="text-sm text-secondary">@{dj.handle}</div>
                    </div>
                    {primaryDjId === dj.id ? (
                      <Badge color="green">Primary</Badge>
                    ) : (
                      <Badge color="slate">Will be merged</Badge>
                    )}
                  </button>
                ))}
              </div>

              {primaryDjId && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">This action cannot be undone</p>
                      <p className="text-secondary mt-1">
                        {selectedDjsData.filter(d => d.id !== primaryDjId).length} DJ profile(s) will be
                        permanently deleted after their data is transferred.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMergeModal(false);
                    setPrimaryDjId(null);
                  }}
                  className="flex-1"
                  disabled={merging}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={!primaryDjId || merging}
                  className="flex-1"
                >
                  {merging ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Merging...</>
                  ) : (
                    <><GitMerge className="h-4 w-4 mr-2" />Merge DJs</>
                  )}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDjToDelete(null);
              setDeleteRequiresForce(null);
            }}
            title="Delete DJ Profile"
            size="md"
          >
            {djToDelete && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-glass rounded-lg">
                  {djToDelete.profile_image_url ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={djToDelete.profile_image_url} alt={djToDelete.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {djToDelete.name?.[0]?.toUpperCase() || "D"}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-primary">{djToDelete.name}</div>
                    <div className="text-sm text-secondary">@{djToDelete.handle}</div>
                  </div>
                </div>

                {deleteRequiresForce ? (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-warning">This DJ has related data</p>
                        <ul className="text-secondary mt-2 space-y-1">
                          {deleteRequiresForce.lineupCount > 0 && (
                            <li>• {deleteRequiresForce.lineupCount} event lineup(s)</li>
                          )}
                          {deleteRequiresForce.followerCount > 0 && (
                            <li>• {deleteRequiresForce.followerCount} follower(s)</li>
                          )}
                        </ul>
                        <p className="text-secondary mt-2">
                          Deleting will permanently remove all associated data.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-secondary">
                    Are you sure you want to delete this DJ profile? This action cannot be undone.
                  </p>
                )}

                <div className="flex gap-3 pt-4 border-t border-border-subtle">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDjToDelete(null);
                      setDeleteRequiresForce(null);
                    }}
                    className="flex-1"
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(deleteRequiresForce !== null)}
                    disabled={deleting}
                    className="flex-1"
                  >
                    {deleting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                    ) : deleteRequiresForce ? (
                      <><Trash2 className="h-4 w-4 mr-2" />Force Delete</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" />Delete DJ</>
                    )}
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
