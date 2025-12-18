import { createClient } from "@crowdstack/shared/supabase/server";
import { Button, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@crowdstack/ui";
import { Plus, Calendar } from "lucide-react";
import Link from "next/link";

export default async function OrganizerEventsPage() {
  // TODO: Fetch actual events
  const events: any[] = [];

  return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Manage your events and track performance
            </p>
          </div>
          <Link href="/app/organizer/events/new">
            <Button variant="primary" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-12 w-12 text-foreground-muted" />}
            title="No events yet"
            description="Create your first event to start tracking attendance and managing promoters."
            action={{
              label: "Create Event",
              onClick: () => window.location.href = "/app/organizer/events/new"
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Check-ins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{new Date(event.start_time).toLocaleDateString()}</TableCell>
                  <TableCell>{event.registrations || 0}</TableCell>
                  <TableCell>{event.check_ins || 0}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-success/10 text-success border border-success/20">
                      Active
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/app/organizer/events/${event.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

