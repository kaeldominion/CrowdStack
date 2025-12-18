"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@crowdstack/ui";
import { QrCode, Search, UserPlus, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CheckInResult {
  id: string;
  name: string;
  status: "success" | "error" | "duplicate" | "banned";
  message: string;
  timestamp: string;
}

export default function DoorScannerPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResult[]>([]);
  const [stats, setStats] = useState({ checkedIn: 0, remaining: 0 });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/live-metrics`);
      if (!response.ok) return;
      const data = await response.json();
      setStats({
        checkedIn: data.current_attendance || 0,
        remaining: data.capacity ? data.capacity - data.current_attendance : 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleCheckIn = async (registrationId?: string, qrToken?: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, qr_token: qrToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const result: CheckInResult = {
          id: data.checkin?.id || "",
          name: data.attendee_name || "Attendee",
          status: "success",
          message: data.message || "Checked in successfully",
          timestamp: new Date().toISOString(),
        };
        setLastCheckIn(result);
        setFlashColor("green");
        setRecentScans((prev) => [result, ...prev].slice(0, 5));
        setTimeout(() => setFlashColor(null), 500);
        loadStats();
      } else {
        const result: CheckInResult = {
          id: "",
          name: "Unknown",
          status: data.error?.includes("banned") ? "banned" : data.error?.includes("duplicate") ? "duplicate" : "error",
          message: data.error || "Check-in failed",
          timestamp: new Date().toISOString(),
        };
        setLastCheckIn(result);
        setFlashColor("red");
        setRecentScans((prev) => [result, ...prev].slice(0, 5));
        setTimeout(() => setFlashColor(null), 500);
      }
    } catch (error: any) {
      const result: CheckInResult = {
        id: "",
        name: "Unknown",
        status: "error",
        message: error.message || "Check-in failed",
        timestamp: new Date().toISOString(),
      };
      setLastCheckIn(result);
      setFlashColor("red");
      setTimeout(() => setFlashColor(null), 500);
    }
  };

  const handleScan = () => {
    // TODO: Implement actual QR scanning with camera API
    // For now, this is a placeholder
    handleCheckIn();
  };

  const handleQuickAdd = () => {
    // TODO: Implement quick add modal
  };

  const getStatusIcon = (status: CheckInResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "banned":
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      default:
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              flashColor === "green" ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ transition: "opacity 0.3s" }}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Door Scanner</h1>
          <p className="text-lg text-white/60">Event ID: {eventId}</p>
        </div>

        {/* Last check-in status - Large */}
        <AnimatePresence>
          {lastCheckIn && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`mb-6 p-6 rounded-lg border-2 ${
                lastCheckIn.status === "success"
                  ? "border-green-500 bg-green-500/10"
                  : lastCheckIn.status === "banned"
                  ? "border-red-500 bg-red-500/10"
                  : "border-red-500 bg-red-500/10"
              }`}
            >
              <div className="flex items-center gap-4">
                {getStatusIcon(lastCheckIn.status)}
                <div className="flex-1">
                  <p className="text-2xl font-bold text-white">{lastCheckIn.name}</p>
                  <p
                    className={`text-lg ${
                      lastCheckIn.status === "success" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {lastCheckIn.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="mb-6">
          <Input
            label="Search by name or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendees..."
            className="bg-white/5 border-white/20 text-white"
          />
        </div>

        {/* Primary actions - Large buttons */}
        <div className="space-y-4 mb-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleScan}
            className="w-full h-20 text-2xl font-bold"
          >
            <QrCode className="h-8 w-8 mr-3" />
            Scan QR Code
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={handleQuickAdd}
            className="w-full h-20 text-2xl font-bold bg-white/10 border-white/20 text-white"
          >
            <UserPlus className="h-8 w-8 mr-3" />
            Quick Add Attendee
          </Button>
        </div>

        {/* Stats - Large */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm font-medium text-white/60 mb-2">Checked In</p>
            <p className="text-4xl font-bold text-white font-mono">{stats.checkedIn}</p>
          </div>
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm font-medium text-white/60 mb-2">Remaining</p>
            <p className="text-4xl font-bold text-white font-mono">{stats.remaining}</p>
          </div>
        </div>

        {/* Last 5 Scans - Fading out */}
        {recentScans.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/60 mb-2">Recent Scans</p>
            {recentScans.map((scan, index) => (
              <motion.div
                key={scan.id || scan.timestamp}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 - index * 0.15 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                {getStatusIcon(scan.status)}
                <div className="flex-1">
                  <p className="text-lg font-medium text-white">{scan.name}</p>
                  <p className="text-sm text-white/60">
                    {new Date(scan.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
