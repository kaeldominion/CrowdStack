"use client";

import { useState, useEffect, useRef } from "react";
import { Input, InlineSpinner } from "@crowdstack/ui";
import { Search, User, Check, X } from "lucide-react";
import { cn } from "@crowdstack/ui";

interface SearchUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  already_assigned: boolean;
}

interface UserSearchInputProps {
  /** API endpoint to search users */
  searchEndpoint: string;
  /** Called when a user is selected */
  onSelect: (user: SearchUser) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the input */
  label?: string;
  /** Additional query params to append to search */
  queryParams?: Record<string, string>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Currently selected user (for controlled mode) */
  selectedUser?: SearchUser | null;
  /** Called when selection is cleared */
  onClear?: () => void;
}

export function UserSearchInput({
  searchEndpoint,
  onSelect,
  placeholder = "Search by name or email...",
  label = "Search User",
  queryParams = {},
  disabled = false,
  selectedUser,
  onClear,
}: UserSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchEndpoint]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUsers = async (searchQuery: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, ...queryParams });
      const response = await fetch(`${searchEndpoint}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.users || []);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (user: SearchUser) => {
    onSelect(user);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear?.();
  };

  // If a user is selected, show their info instead of the search input
  if (selectedUser) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-secondary">{label}</label>
        )}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-glass border border-border-subtle">
          {selectedUser.avatar_url ? (
            <img
              src={selectedUser.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-accent-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-primary truncate">{selectedUser.name}</p>
            <p className="text-sm text-secondary truncate">{selectedUser.email}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-md hover:bg-active text-secondary hover:text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          label={label}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
        <div className="absolute left-3 top-[38px] text-secondary">
          {searching ? (
            <InlineSpinner size="sm" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-lg bg-raised border border-border-subtle shadow-lg max-h-64 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => !user.already_assigned && handleSelect(user)}
              disabled={user.already_assigned}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                user.already_assigned
                  ? "opacity-50 cursor-not-allowed bg-glass/50"
                  : "hover:bg-active cursor-pointer"
              )}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-accent-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{user.name}</p>
                <p className="text-xs text-secondary truncate">{user.email}</p>
              </div>
              {user.already_assigned && (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Check className="h-3 w-3" />
                  <span>Added</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && query.length >= 2 && results.length === 0 && !searching && (
        <div className="absolute z-50 w-full mt-1 py-3 px-4 rounded-lg bg-raised border border-border-subtle shadow-lg text-center text-sm text-secondary">
          No users found for "{query}"
        </div>
      )}
    </div>
  );
}
