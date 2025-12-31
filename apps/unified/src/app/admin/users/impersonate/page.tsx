"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Container,
  Section,
  Button,
  Input,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import {
  Search,
  User,
  Building2,
  Calendar,
  Megaphone,
  Radio,
  LogIn,
  AlertTriangle,
  Users,
  ChevronRight,
} from "lucide-react";

interface SearchResult {
  type: "user" | "venue" | "organizer" | "promoter" | "dj";
  id: string;
  name: string;
  email?: string;
  attachedUsers?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  }[];
}

export default function ImpersonateUserPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"user" | "entity">("user");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search as user types
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search.length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setSelectedEntity(null);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [search, searchType]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(search)}&type=${searchType}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startImpersonation = async (userId: string, userEmail: string) => {
    setImpersonating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start impersonation");
      }

      // Redirect to the main app - the impersonation banner will show
      router.push("/app");
    } catch (err: any) {
      console.error("Impersonation error:", err);
      setError(err.message || "Failed to start impersonation");
      setImpersonating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />;
      case "venue":
        return <Building2 className="h-4 w-4" />;
      case "organizer":
        return <Calendar className="h-4 w-4" />;
      case "promoter":
        return <Megaphone className="h-4 w-4" />;
      case "dj":
        return <Radio className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "user":
        return "primary";
      case "venue":
        return "info";
      case "organizer":
        return "secondary";
      case "promoter":
        return "warning";
      case "dj":
        return "success";
      default:
        return "primary";
    }
  };

  return (
    <Section spacing="lg">
      <Container>
        <div className="mb-6">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">
            Login as User
          </h1>
          <p className="text-sm text-secondary">
            Impersonate a user to see the platform from their perspective. Useful for debugging and support.
          </p>
        </div>

        {/* Warning Banner */}
        <Card className="!p-4 mb-6 border-accent-warning/50 bg-accent-warning/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary">Impersonation Mode</p>
              <p className="text-sm text-secondary mt-1">
                When impersonating, you'll see the platform exactly as the user sees it. 
                A banner will appear at the top of the screen. Click "Exit Impersonation" to return to your admin view.
                All actions taken while impersonating are logged.
              </p>
            </div>
          </div>
        </Card>

        {/* Search Type Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={searchType === "user" ? "primary" : "ghost"}
            onClick={() => {
              setSearchType("user");
              setSelectedEntity(null);
            }}
          >
            <User className="h-4 w-4 mr-2" />
            Search Users
          </Button>
          <Button
            variant={searchType === "entity" ? "primary" : "ghost"}
            onClick={() => {
              setSearchType("entity");
              setSelectedEntity(null);
            }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Search by Entity
          </Button>
        </div>

        {/* Search Input */}
        <Card className="!p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
            <Input
              placeholder={
                searchType === "user"
                  ? "Search by email or name..."
                  : "Search venues, organizers, promoters, DJs..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {error && (
          <Card className="!p-4 mb-6 border-accent-error/50 bg-accent-error/10">
            <p className="text-accent-error">{error}</p>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner text="Searching..." />
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && !selectedEntity && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
              {results.length} Result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((result) => (
              <Card
                key={`${result.type}-${result.id}`}
                hover
                className="!p-4 cursor-pointer"
                onClick={() => {
                  if (result.type === "user") {
                    startImpersonation(result.id, result.email || result.name);
                  } else {
                    setSelectedEntity(result);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                      {getIcon(result.type)}
                    </div>
                    <div>
                      <p className="font-medium text-primary">{result.name}</p>
                      {result.email && (
                        <p className="text-sm text-secondary">{result.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getTypeColor(result.type) as any}>
                      {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                    </Badge>
                    {result.type === "user" ? (
                      <LogIn className="h-4 w-4 text-secondary" />
                    ) : (
                      <div className="flex items-center gap-1 text-secondary">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">
                          {result.attachedUsers?.length || 0}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Selected Entity - Show Attached Users */}
        {selectedEntity && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedEntity(null)}
              className="mb-2"
            >
              ← Back to results
            </Button>

            <Card className="!p-4 border-accent-secondary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                  {getIcon(selectedEntity.type)}
                </div>
                <div>
                  <p className="font-bold text-primary text-lg">
                    {selectedEntity.name}
                  </p>
                  <Badge variant={getTypeColor(selectedEntity.type) as any}>
                    {selectedEntity.type.charAt(0).toUpperCase() +
                      selectedEntity.type.slice(1)}
                  </Badge>
                </div>
              </div>

              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
                Attached Users ({selectedEntity.attachedUsers?.length || 0})
              </p>

              {!selectedEntity.attachedUsers?.length ? (
                <p className="text-secondary text-sm py-4">
                  No users are attached to this entity.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEntity.attachedUsers.map((user) => (
                    <Card
                      key={user.id}
                      hover
                      className="!p-3 cursor-pointer"
                      onClick={() => startImpersonation(user.id, user.email)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-primary text-sm">
                              {user.name || user.email}
                            </p>
                            {user.name && (
                              <p className="text-xs text-secondary">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.role && (
                            <Badge variant="secondary" className="text-xs">
                              {user.role}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            disabled={impersonating}
                          >
                            <LogIn className="h-3 w-3 mr-1" />
                            Login
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* No Results */}
        {!loading && search.length >= 2 && results.length === 0 && (
          <Card className="!p-8 text-center">
            <User className="h-12 w-12 text-secondary mx-auto mb-4" />
            <p className="text-primary font-medium">No results found</p>
            <p className="text-sm text-secondary mt-1">
              Try a different search term
            </p>
          </Card>
        )}

        {/* Initial State */}
        {!loading && search.length < 2 && results.length === 0 && (
          <Card className="!p-8 text-center !border-dashed">
            <Search className="h-12 w-12 text-secondary mx-auto mb-4" />
            <p className="text-primary font-medium">
              Search for a user to impersonate
            </p>
            <p className="text-sm text-secondary mt-1">
              Enter at least 2 characters to search
            </p>
          </Card>
        )}
      </Container>
    </Section>
  );
}

