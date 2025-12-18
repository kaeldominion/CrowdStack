"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input, Card, Badge } from "@crowdstack/ui";
import { QrCode, Search, UserPlus, CheckCircle2, XCircle } from "lucide-react";

export default function DoorScannerPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<{ name: string; status: "success" | "error" } | null>(null);

  const handleScan = () => {
    // TODO: Implement QR scanning
    setLastCheckIn({ name: "John Doe", status: "success" });
    setTimeout(() => setLastCheckIn(null), 3000);
  };

  const handleQuickAdd = () => {
    // TODO: Implement quick add
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Door Scanner</h1>
          <p className="mt-2 text-sm text-foreground-muted">Event ID: {eventId}</p>
        </div>

        {/* Last check-in status */}
        {lastCheckIn && (
          <Card className={`mb-6 border-2 ${
            lastCheckIn.status === "success" 
              ? "border-success bg-success/10" 
              : "border-error bg-error/10"
          }`}>
            <div className="flex items-center gap-3">
              {lastCheckIn.status === "success" ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-error" />
              )}
              <div>
                <p className="font-medium text-foreground">{lastCheckIn.name}</p>
                <p className={`text-sm ${
                  lastCheckIn.status === "success" ? "text-success" : "text-error"
                }`}>
                  {lastCheckIn.status === "success" ? "Checked in successfully" : "Check-in failed"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <div className="space-y-4">
            <Input
              label="Search by name or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendees..."
            />
          </div>
        </Card>

        {/* Primary actions */}
        <div className="space-y-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleScan}
            className="w-full h-16 text-lg"
          >
            <QrCode className="h-6 w-6 mr-3" />
            Scan QR Code
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={handleQuickAdd}
            className="w-full h-16 text-lg"
          >
            <UserPlus className="h-6 w-6 mr-3" />
            Quick Add Attendee
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm font-medium text-foreground-muted">Checked In</p>
            <p className="mt-2 text-2xl font-bold text-foreground">0</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-foreground-muted">Remaining</p>
            <p className="mt-2 text-2xl font-bold text-foreground">0</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

