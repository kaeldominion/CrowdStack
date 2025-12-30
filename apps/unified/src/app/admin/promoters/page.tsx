"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal, LoadingSpinner } from "@crowdstack/ui";
import { Users, Search, ChevronRight, X, UserPlus, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminPromotersPage() {
  const [promoters, setPromoters] = useState<any[]>([]);
  const [filteredPromoters, setFilteredPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPromoter, setSelectedPromoter] = useState<any | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertEmail, setConvertEmail] = useState("");
  const [convertAttendeeId, setConvertAttendeeId] = useState("");
  const [convertMethod, setConvertMethod] = useState<"email" | "attendeeId">("email");
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{ success: boolean; message: string; promoter?: any } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string; promoter?: any } | null>(null);

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
      filtered = filtered.filter((p) => {
        // Match name
        if (p.name.toLowerCase().includes(searchLower)) return true;
        
        // Match email (full or username part)
        if (p.email) {
          const emailLower = p.email.toLowerCase();
          if (emailLower.includes(searchLower)) return true;
          // Also check username part (before @)
          const usernamePart = emailLower.split("@")[0];
          if (usernamePart.includes(searchLower)) return true;
        }
        
        // Match phone
        if (p.phone?.includes(search)) return true;
        
        return false;
      });
    }
    setFilteredPromoters(filtered);
  };

  const handleConvertToPromoter = async () => {
    if (convertMethod === "email" && !convertEmail.trim()) {
      setConvertResult({ success: false, message: "Email is required" });
      return;
    }
    if (convertMethod === "attendeeId" && !convertAttendeeId.trim()) {
      setConvertResult({ success: false, message: "Attendee ID is required" });
      return;
    }

    setConverting(true);
    setConvertResult(null);

    try {
      const response = await fetch("/api/admin/users/convert-to-promoter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          convertMethod === "email"
            ? { email: convertEmail.trim() }
            : { attendeeId: convertAttendeeId.trim() }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        setConvertResult({ success: false, message: data.error || "Conversion failed" });
        return;
      }

      setConvertResult({
        success: true,
        message: data.message || "User successfully converted to promoter",
        promoter: data.promoter,
      });

      // Reload promoters list
      if (!data.alreadyPromoter) {
        await loadPromoters();
      }

      // Clear form after successful conversion
      setTimeout(() => {
        setConvertEmail("");
        setConvertAttendeeId("");
        setConvertResult(null);
        if (!data.alreadyPromoter) {
          setShowConvertModal(false);
        }
      }, 3000);
    } catch (error: any) {
      setConvertResult({ success: false, message: error.message || "Failed to convert user" });
    } finally {
      setConverting(false);
    }
  };

  const handleCreatePromoter = async () => {
    if (!createName.trim()) {
      setCreateResult({ success: false, message: "Name is required" });
      return;
    }
    if (!createEmail.trim() && !createPhone.trim()) {
      setCreateResult({ success: false, message: "Either email or phone is required" });
      return;
    }

    setCreating(true);
    setCreateResult(null);

    try {
      const response = await fetch("/api/admin/promoters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim() || null,
          phone: createPhone.trim() || null,
          parent_promoter_id: createParentId.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateResult({ success: false, message: data.error || "Failed to create promoter" });
        return;
      }

      setCreateResult({
        success: true,
        message: "Promoter created successfully",
        promoter: data.promoter,
      });

      // Reload promoters list
      await loadPromoters();

      // Clear form after successful creation
      setTimeout(() => {
        setCreateName("");
        setCreateEmail("");
        setCreatePhone("");
        setCreateParentId("");
        setCreateResult(null);
        setShowCreateModal(false);
      }, 2000);
    } catch (error: any) {
      setCreateResult({ success: false, message: error.message || "Failed to create promoter" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading promoters..." />
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Promoter Management</h1>
              <p className="text-sm text-secondary">
                View all promoters and their performance metrics
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateResult(null);
                  setCreateName("");
                  setCreateEmail("");
                  setCreatePhone("");
                  setCreateParentId("");
                }}
                className="flex items-center gap-2"
                variant="primary"
              >
                <UserPlus className="h-4 w-4" />
                Create Promoter
              </Button>
              <Button
                onClick={() => {
                  setShowConvertModal(true);
                  setConvertResult(null);
                  setConvertEmail("");
                  setConvertAttendeeId("");
                  setConvertMethod("email");
                }}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <UserPlus className="h-4 w-4" />
                Convert to Promoter
              </Button>
            </div>
          </div>

          <Card className="!p-4">
            <Input
              placeholder="Search promoters by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          <div className="mt-4 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {filteredPromoters.length} of {promoters.length} promoters
            </p>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
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
                      <TableCell colSpan={7} className="text-center py-8 text-secondary">
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
                              <div className="text-sm text-secondary">{promoter.email}</div>
                            )}
                            {promoter.phone && (
                              <div className="text-sm text-secondary">{promoter.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{promoter.parent?.name || "—"}</TableCell>
                        <TableCell>{promoter.events_count || 0}</TableCell>
                        <TableCell>{promoter.total_referrals || 0}</TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(promoter.created_at).toLocaleDateString()}
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

          {/* Create Promoter Modal */}
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateResult(null);
              setCreateName("");
              setCreateEmail("");
              setCreatePhone("");
              setCreateParentId("");
            }}
            title="Create New Promoter"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Create a new promoter profile from scratch. This creates a promoter profile without requiring an existing user or attendee account.
              </p>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
                <p className="text-xs text-secondary mt-1">
                  Either email or phone is required
                </p>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Phone
                </label>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
                <p className="text-xs text-secondary mt-1">
                  Either email or phone is required
                </p>
              </div>

              {/* Parent Promoter Field (Optional) */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Parent Promoter ID <span className="text-secondary">(optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="UUID of parent promoter"
                  value={createParentId}
                  onChange={(e) => setCreateParentId(e.target.value)}
                />
                <p className="text-xs text-secondary mt-1">
                  Leave empty if this is a top-level promoter
                </p>
              </div>

              {/* Result Message */}
              {createResult && (
                <div
                  className={`p-4 rounded-md flex items-start gap-3 ${
                    createResult.success
                      ? "bg-success/10 border border-success/20"
                      : "bg-warning/10 border border-warning/20"
                  }`}
                >
                  {createResult.success ? (
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        createResult.success ? "text-success" : "text-warning"
                      }`}
                    >
                      {createResult.message}
                    </p>
                    {createResult.success && createResult.promoter && (
                      <div className="mt-2 text-xs text-secondary">
                        <p>
                          <strong>Name:</strong> {createResult.promoter.name}
                        </p>
                        {createResult.promoter.email && (
                          <p>
                            <strong>Email:</strong> {createResult.promoter.email}
                          </p>
                        )}
                        {createResult.promoter.phone && (
                          <p>
                            <strong>Phone:</strong> {createResult.promoter.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateResult(null);
                    setCreateName("");
                    setCreateEmail("");
                    setCreatePhone("");
                    setCreateParentId("");
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePromoter}
                  disabled={
                    creating ||
                    !createName.trim() ||
                    (!createEmail.trim() && !createPhone.trim())
                  }
                >
                  {creating ? "Creating..." : "Create Promoter"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Convert to Promoter Modal */}
          <Modal
            isOpen={showConvertModal}
            onClose={() => {
              setShowConvertModal(false);
              setConvertResult(null);
              setConvertEmail("");
              setConvertAttendeeId("");
            }}
            title="Convert User/Attendee to Promoter"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Convert a user or attendee to a promoter. The system will find the user by email or attendee ID,
                create a promoter profile with their existing information, and assign the promoter role.
              </p>

              {/* Method Selection */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Search by
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={convertMethod === "email"}
                      onChange={() => setConvertMethod("email")}
                      className="text-primary"
                    />
                    <span className="text-sm text-primary">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={convertMethod === "attendeeId"}
                      onChange={() => setConvertMethod("attendeeId")}
                      className="text-primary"
                    />
                    <span className="text-sm text-primary">Attendee ID</span>
                  </label>
                </div>
              </div>

              {/* Input Fields */}
              {convertMethod === "email" ? (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={convertEmail}
                    onChange={(e) => setConvertEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && convertEmail.trim()) {
                        handleConvertToPromoter();
                      }
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Attendee ID
                  </label>
                  <Input
                    type="text"
                    placeholder="UUID of attendee"
                    value={convertAttendeeId}
                    onChange={(e) => setConvertAttendeeId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && convertAttendeeId.trim()) {
                        handleConvertToPromoter();
                      }
                    }}
                  />
                </div>
              )}

              {/* Result Message */}
              {convertResult && (
                <div
                  className={`p-4 rounded-md flex items-start gap-3 ${
                    convertResult.success
                      ? "bg-success/10 border border-success/20"
                      : "bg-warning/10 border border-warning/20"
                  }`}
                >
                  {convertResult.success ? (
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        convertResult.success ? "text-success" : "text-warning"
                      }`}
                    >
                      {convertResult.message}
                    </p>
                    {convertResult.success && convertResult.promoter && (
                      <div className="mt-2 text-xs text-secondary">
                        <p>
                          <strong>Name:</strong> {convertResult.promoter.name}
                        </p>
                        {convertResult.promoter.email && (
                          <p>
                            <strong>Email:</strong> {convertResult.promoter.email}
                          </p>
                        )}
                        {convertResult.promoter.phone && (
                          <p>
                            <strong>Phone:</strong> {convertResult.promoter.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowConvertModal(false);
                    setConvertResult(null);
                    setConvertEmail("");
                    setConvertAttendeeId("");
                  }}
                  disabled={converting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConvertToPromoter}
                  disabled={
                    converting ||
                    (convertMethod === "email" && !convertEmail.trim()) ||
                    (convertMethod === "attendeeId" && !convertAttendeeId.trim())
                  }
                >
                  {converting ? "Converting..." : "Convert to Promoter"}
                </Button>
              </div>
            </div>
          </Modal>

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
                  <h3 className="text-lg font-semibold text-primary">{selectedPromoter.name}</h3>
                  {selectedPromoter.parent?.name && (
                    <p className="text-sm text-secondary">
                      Parent: {selectedPromoter.parent.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wider">Email</p>
                    <p className="text-sm text-primary">{selectedPromoter.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-primary">{selectedPromoter.phone || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wider">Events</p>
                    <p className="text-sm text-primary">{selectedPromoter.events_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wider">Total Referrals</p>
                    <p className="text-sm text-primary">{selectedPromoter.total_referrals || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-secondary uppercase tracking-wider">Created</p>
                  <p className="text-sm text-primary">
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

