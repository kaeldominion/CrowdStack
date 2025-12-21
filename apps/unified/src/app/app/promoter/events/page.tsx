"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Tabs, TabsList, TabsTrigger, TabsContent, LoadingSpinner } from "@crowdstack/ui";
import { Calendar, Search, Eye, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  status: string;
  venue?: { name: string };
  promoter_access_type?: string;
  commission_config?: any;
}

export default function PromoterEventsPage() {
  const router = useRouter();
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("available");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const [availableRes, myRes] = await Promise.all([
        fetch("/api/promoter/events/available"),
        fetch("/api/promoter/events/my"),
      ]);

      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableEvents(data.events || []);
      }

      if (myRes.ok) {
        const data = await myRes.json();
        setMyEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestToPromote = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/promoters/request`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to request");
      await loadEvents();
    } catch (error) {
      console.error("Error requesting to promote:", error);
    }
  };

  const filteredAvailable = availableEvents.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMy = myEvents.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Events</h1>
        <p className="mt-2 text-sm text-white/60">
          Discover events to promote or manage your assigned events
        </p>
      </div>

      <Card>
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="available">Available Events</TabsTrigger>
              <TabsTrigger value="my">My Events</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTab === "available" ? (
                filteredAvailable.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center py-8 text-foreground-muted">
                      No available events found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAvailable.map((event) => (
                    <TableRow 
                      key={event.id} 
                      hover
                      onClick={() => router.push(`/e/${event.slug}`)}
                    >
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{event.venue?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-foreground-muted">
                        {new Date(event.start_time).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.status === "published" ? "success" : "warning"}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">{event.promoter_access_type || "public"}</Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestToPromote(event.id);
                          }}
                          className="px-3 py-1.5 text-sm rounded-sm bg-transparent text-foreground hover:bg-surface transition-colors"
                        >
                          Request to Promote
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                filteredMy.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center py-8 text-foreground-muted">
                      No events assigned yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMy.map((event) => (
                    <TableRow 
                      key={event.id} 
                      hover
                      onClick={() => router.push(`/app/promoter/events/${event.id}`)}
                    >
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{event.venue?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-foreground-muted">
                        {new Date(event.start_time).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.status === "published" ? "success" : "warning"}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/app/promoter/events/${event.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
