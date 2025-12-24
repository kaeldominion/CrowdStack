"use client";

import { useState } from "react";
import { Button } from "@crowdstack/ui";
import { Calendar, X } from "lucide-react";

interface AddToCalendarProps {
  eventName: string;
  startTime: string;
  endTime?: string | null;
  description?: string;
  location?: string;
  className?: string;
}

export function AddToCalendar({
  eventName,
  startTime,
  endTime,
  description,
  location,
  className = "",
}: AddToCalendarProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDateForCalendar = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const generateCalendarUrl = (service: "google" | "outlook" | "yahoo" | "ics") => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours if no end time
    
    const startFormatted = formatDateForCalendar(start);
    const endFormatted = formatDateForCalendar(end);
    
    const details = description || "";
    const loc = location || "";
    
    switch (service) {
      case "google":
        const googleUrl = new URL("https://calendar.google.com/calendar/render");
        googleUrl.searchParams.set("action", "TEMPLATE");
        googleUrl.searchParams.set("text", eventName);
        googleUrl.searchParams.set("dates", `${startFormatted}/${endFormatted}`);
        if (details) googleUrl.searchParams.set("details", details);
        if (loc) googleUrl.searchParams.set("location", loc);
        return googleUrl.toString();
        
      case "outlook":
        const outlookUrl = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
        outlookUrl.searchParams.set("subject", eventName);
        outlookUrl.searchParams.set("startdt", start.toISOString());
        outlookUrl.searchParams.set("enddt", end.toISOString());
        if (details) outlookUrl.searchParams.set("body", details);
        if (loc) outlookUrl.searchParams.set("location", loc);
        return outlookUrl.toString();
        
      case "yahoo":
        const yahooUrl = new URL("https://calendar.yahoo.com/?v=60&view=d&type=20");
        yahooUrl.searchParams.set("title", eventName);
        yahooUrl.searchParams.set("st", startFormatted);
        yahooUrl.searchParams.set("dur", String(Math.floor((end.getTime() - start.getTime()) / 60000)));
        if (details) yahooUrl.searchParams.set("desc", details);
        if (loc) yahooUrl.searchParams.set("in_loc", loc);
        return yahooUrl.toString();
        
      case "ics":
        // Generate ICS file content
        const icsContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//CrowdStack//Event Calendar//EN",
          "BEGIN:VEVENT",
          `DTSTART:${startFormatted}`,
          `DTEND:${endFormatted}`,
          `SUMMARY:${eventName}`,
          ...(details ? [`DESCRIPTION:${details.replace(/\n/g, "\\n")}`] : []),
          ...(loc ? [`LOCATION:${loc}`] : []),
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
        
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        return url;
        
      default:
        return "";
    }
  };

  const handleCalendarClick = (service: "google" | "outlook" | "yahoo" | "ics") => {
    const url = generateCalendarUrl(service);
    
    if (service === "ics") {
      // Download ICS file
      const link = document.createElement("a");
      link.href = url;
      link.download = `${eventName.replace(/[^a-z0-9]/gi, "_")}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Open calendar service in new window
      window.open(url, "_blank", "noopener,noreferrer");
    }
    
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center justify-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
      </Button>
      
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-black/90 backdrop-blur-xl border border-white/30 rounded-xl overflow-hidden shadow-xl">
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
                <span className="text-sm font-semibold text-white">Select Calendar</span>
                <button
                  onClick={() => setShowMenu(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                <button
                  onClick={() => handleCalendarClick("google")}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Google Calendar
                </button>
                <button
                  onClick={() => handleCalendarClick("outlook")}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Outlook
                </button>
                <button
                  onClick={() => handleCalendarClick("yahoo")}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Yahoo Calendar
                </button>
                <button
                  onClick={() => handleCalendarClick("ics")}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Download .ics file
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

