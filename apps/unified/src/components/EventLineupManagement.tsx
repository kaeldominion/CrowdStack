"use client";

import { useState, useEffect } from "react";
import { Card, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Modal, Input, Textarea } from "@crowdstack/ui";
import { Radio, Plus, Trash2, ArrowUp, ArrowDown, Star, Search, X, DollarSign, Eye, UserPlus, AlertTriangle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface DJ {
  id: string;
  handle: string;
  name: string;
  profile_image_url: string | null;
  genres: string[] | null;
  location: string | null;
}

interface GigInfo {
  gig_posting_id: string;
  gig_title: string;
  payment_amount: number | null;
  payment_currency: string | null;
  show_payment: boolean;
  confirmed_at: string | null;
}

interface LineupItem {
  id: string;
  dj_id: string;
  display_order: number;
  is_headliner: boolean;
  djs: DJ;
  gig_info: GigInfo | null;
}

interface EventLineupManagementProps {
  eventId: string;
}

export function EventLineupManagement({ eventId }: EventLineupManagementProps) {
  const [lineup, setLineup] = useState<LineupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [djSearchResults, setDjSearchResults] = useState<DJ[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingGigTerms, setViewingGigTerms] = useState<{ djId: string; gigInfo: GigInfo } | null>(null);

  // Create DJ state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDJName, setCreateDJName] = useState("");
  const [createDJBio, setCreateDJBio] = useState("");
  const [createDJLocation, setCreateDJLocation] = useState("");
  const [createDJInstagram, setCreateDJInstagram] = useState("");
  const [createDJSoundcloud, setCreateDJSoundcloud] = useState("");
  const [creatingDJ, setCreatingDJ] = useState(false);
  const [duplicateDJs, setDuplicateDJs] = useState<DJ[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    loadLineup();
  }, [eventId]);

  const loadLineup = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/lineup`);
      if (!response.ok) return;
      const data = await response.json();
      setLineup(data.lineups || []);
    } catch (error) {
      console.error("Failed to load lineup:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchDJs = async (query: string) => {
    if (!query.trim()) {
      setDjSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/djs/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out DJs already in lineup
        const existingDjIds = new Set(lineup.map((l) => l.dj_id));
        setDjSearchResults((data.djs || []).filter((dj: DJ) => !existingDjIds.has(dj.id)));
      }
    } catch (error) {
      console.error("Failed to search DJs:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchDJs(value);
  };

  const handleAddDJ = async (dj: DJ, isHeadliner: boolean = false) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/events/${eventId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dj_id: dj.id,
          is_headliner: isHeadliner,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add DJ");
      }

      setShowAddModal(false);
      setSearchQuery("");
      setDjSearchResults([]);
      await loadLineup();
    } catch (error: any) {
      alert(error.message || "Failed to add DJ to lineup");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDJ = async (djId: string) => {
    if (!confirm("Remove this DJ from the lineup?")) return;

    try {
      const response = await fetch(`/api/events/${eventId}/lineup?dj_id=${djId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove DJ");

      await loadLineup();
    } catch (error) {
      alert("Failed to remove DJ from lineup");
    }
  };

  const handleReorder = async (direction: "up" | "down", index: number) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === lineup.length - 1)
    ) {
      return;
    }

    const newOrder = [...lineup];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

    // Update display_order values
    const updates = newOrder.map((item, idx) => ({
      lineup_id: item.id,
      display_order: idx,
    }));

    try {
      const response = await fetch(`/api/events/${eventId}/lineup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error("Failed to reorder");

      await loadLineup();
    } catch (error) {
      alert("Failed to reorder lineup");
    }
  };

  const handleToggleHeadliner = async (lineupId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/lineup/${lineupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_headliner: !currentValue }),
      });

      if (!response.ok) throw new Error("Failed to update headliner status");

      await loadLineup();
    } catch (error) {
      alert("Failed to update headliner status");
    }
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setCreateDJName("");
    setCreateDJBio("");
    setCreateDJLocation("");
    setCreateDJInstagram("");
    setCreateDJSoundcloud("");
    setDuplicateDJs([]);
    setShowDuplicateWarning(false);
  };

  const handleCreateDJ = async (confirmed: boolean = false) => {
    if (!createDJName.trim()) {
      alert("DJ name is required");
      return;
    }

    setCreatingDJ(true);
    try {
      const response = await fetch("/api/djs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createDJName.trim(),
          bio: createDJBio.trim() || undefined,
          location: createDJLocation.trim() || undefined,
          instagram_url: createDJInstagram.trim() || undefined,
          soundcloud_url: createDJSoundcloud.trim() || undefined,
          confirmed,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.duplicates) {
        // Potential duplicates found
        setDuplicateDJs(data.duplicates);
        setShowDuplicateWarning(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to create DJ");
      }

      // DJ created successfully - add to lineup
      await handleAddDJ(data.dj, false);
      resetCreateForm();
    } catch (error: any) {
      alert(error.message || "Failed to create DJ");
    } finally {
      setCreatingDJ(false);
    }
  };

  const handleSelectDuplicate = async (dj: DJ) => {
    // User selected an existing DJ instead of creating new
    await handleAddDJ(dj, false);
    resetCreateForm();
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="text-secondary">Loading lineup...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-semibold text-primary">Lineup</h2>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add DJ
        </Button>
      </div>

      {lineup.length === 0 ? (
        <Card className="p-8 text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No DJs in lineup</h3>
          <p className="text-white/60 mb-4">Add DJs to build the event lineup</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First DJ
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>DJ</TableHead>
                <TableHead className="w-32">Headliner</TableHead>
                <TableHead className="w-32">Gig Terms</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineup.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder("up", index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReorder("down", index)}
                        disabled={index === lineup.length - 1}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dj/${item.djs.handle}`} className="flex items-center gap-3 hover:opacity-80">
                      {item.djs.profile_image_url ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-border-subtle">
                          <Image
                            src={item.djs.profile_image_url}
                            alt={item.djs.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-border-subtle">
                          {item.djs.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-primary">{item.djs.name}</div>
                        {item.djs.location && (
                          <div className="text-sm text-secondary">{item.djs.location}</div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleHeadliner(item.id, item.is_headliner)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                        item.is_headliner
                          ? "bg-warning/20 border-warning/50 text-warning"
                          : "bg-glass border-border-subtle text-secondary hover:bg-white/5"
                      }`}
                    >
                      <Star className={`h-4 w-4 ${item.is_headliner ? "fill-warning" : ""}`} />
                      <span className="text-sm">{item.is_headliner ? "Headliner" : "Support"}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    {item.gig_info ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-xs">
                          <DollarSign className="h-3 w-3" />
                          <span>Gig</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingGigTerms({ djId: item.dj_id, gigInfo: item.gig_info! })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-secondary text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveDJ(item.dj_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add DJ Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearchQuery("");
          setDjSearchResults([]);
          resetCreateForm();
        }}
        title={showCreateForm ? "Create New DJ Profile" : "Add DJ to Lineup"}
        size="md"
      >
        {showDuplicateWarning ? (
          // Duplicate Warning View
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-warning">Potential Duplicates Found</h4>
                  <p className="text-sm text-secondary mt-1">
                    We found DJs with similar names. You can select one of these or create a new profile anyway.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {duplicateDJs.map((dj) => (
                <button
                  key={dj.id}
                  onClick={() => handleSelectDuplicate(dj)}
                  className="w-full flex items-center gap-3 p-3 bg-glass border border-border-subtle rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  {dj.profile_image_url ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={dj.profile_image_url} alt={dj.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {dj.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-primary truncate">{dj.name}</div>
                    {dj.location && <div className="text-sm text-secondary truncate">{dj.location}</div>}
                  </div>
                  <span className="text-xs text-accent-secondary">Select</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                onClick={() => setShowDuplicateWarning(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={() => handleCreateDJ(true)}
                disabled={creatingDJ}
                className="flex-1"
              >
                {creatingDJ ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  "Create Anyway"
                )}
              </Button>
            </div>
          </div>
        ) : showCreateForm ? (
          // Create DJ Form
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                DJ Name <span className="text-accent-error">*</span>
              </label>
              <Input
                value={createDJName}
                onChange={(e) => setCreateDJName(e.target.value)}
                placeholder="DJ Name"
                disabled={creatingDJ}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Location</label>
              <Input
                value={createDJLocation}
                onChange={(e) => setCreateDJLocation(e.target.value)}
                placeholder="City, Country"
                disabled={creatingDJ}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Bio</label>
              <Textarea
                value={createDJBio}
                onChange={(e) => setCreateDJBio(e.target.value)}
                placeholder="Short bio..."
                rows={3}
                disabled={creatingDJ}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Instagram</label>
                <Input
                  value={createDJInstagram}
                  onChange={(e) => setCreateDJInstagram(e.target.value)}
                  placeholder="@handle"
                  disabled={creatingDJ}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">SoundCloud</label>
                <Input
                  value={createDJSoundcloud}
                  onChange={(e) => setCreateDJSoundcloud(e.target.value)}
                  placeholder="soundcloud.com/..."
                  disabled={creatingDJ}
                />
              </div>
            </div>

            <p className="text-xs text-secondary">
              This creates a placeholder DJ profile that can be claimed by the DJ later.
            </p>

            <div className="flex gap-3 pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                onClick={resetCreateForm}
                disabled={creatingDJ}
                className="flex-1"
              >
                Back to Search
              </Button>
              <Button
                onClick={() => handleCreateDJ(false)}
                disabled={creatingDJ || !createDJName.trim()}
                className="flex-1"
              >
                {creatingDJ ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Create & Add</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Search View
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Search DJs</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-10"
                />
              </div>
            </div>

            {searching && (
              <div className="text-center py-4 text-secondary">Searching...</div>
            )}

            {!searching && searchQuery && djSearchResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-secondary mb-3">No DJs found matching "{searchQuery}"</p>
                <Button onClick={() => {
                  setShowCreateForm(true);
                  setCreateDJName(searchQuery);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create "{searchQuery}" as new DJ
                </Button>
              </div>
            )}

            {djSearchResults.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {djSearchResults.map((dj) => (
                  <div
                    key={dj.id}
                    className="flex items-center justify-between p-3 bg-glass border border-border-subtle rounded-lg"
                  >
                    <Link href={`/dj/${dj.handle}`} className="flex items-center gap-3 flex-1 hover:opacity-80">
                      {dj.profile_image_url ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-border-subtle">
                          <Image
                            src={dj.profile_image_url}
                            alt={dj.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-border-subtle">
                          {dj.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-primary">{dj.name}</div>
                        {dj.location && <div className="text-sm text-secondary">{dj.location}</div>}
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddDJ(dj, false)}
                        disabled={saving}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddDJ(dj, true)}
                        disabled={saving}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Headliner
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create New DJ Option */}
            <div className="pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create New DJ Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Gig Terms Modal */}
      <Modal
        isOpen={viewingGigTerms !== null}
        onClose={() => setViewingGigTerms(null)}
        title="Gig Payment Terms"
        size="md"
      >
        {viewingGigTerms && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Gig Title</label>
              <p className="text-primary">{viewingGigTerms.gigInfo.gig_title}</p>
            </div>
            
            {viewingGigTerms.gigInfo.show_payment && viewingGigTerms.gigInfo.payment_amount && (
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Payment Amount</label>
                <p className="text-primary text-lg font-semibold">
                  {viewingGigTerms.gigInfo.payment_amount} {viewingGigTerms.gigInfo.payment_currency || "USD"}
                </p>
              </div>
            )}
            
            {!viewingGigTerms.gigInfo.show_payment && (
              <div>
                <p className="text-secondary text-sm">Payment amount is not disclosed for this gig.</p>
              </div>
            )}
            
            {viewingGigTerms.gigInfo.confirmed_at && (
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Confirmed At</label>
                <p className="text-secondary text-sm">
                  {new Date(viewingGigTerms.gigInfo.confirmed_at).toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                onClick={() => window.open(`/app/organizer/gigs/${viewingGigTerms.gigInfo.gig_posting_id}`, "_blank")}
              >
                View Full Gig Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}



