"use client";

import { useState } from "react";
import { Button, Modal } from "@crowdstack/ui";
import { Calendar, ExternalLink, Download } from "lucide-react";

interface CalendarButtonsProps {
  eventName: string;
  startTime: string;
  endTime?: string | null;
  description?: string | null;
  venue?: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
  url: string;
  compact?: boolean; // Smaller size for inline layout
}

export function CalendarButtons({
  eventName,
  startTime,
  endTime,
  description,
  venue,
  url,
  compact = false,
}: CalendarButtonsProps) {
  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

  // Format date as YYYYMMDDTHHmmss
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  // Format date as YYYYMMDD
  const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  const location = venue
    ? [
        venue.name,
        venue.address,
        venue.city,
        venue.state,
        venue.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const eventDescription = [
    description,
    url && `Event page: ${url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Google Calendar
  const googleCalendarUrl = new URL("https://calendar.google.com/calendar/render");
  googleCalendarUrl.searchParams.set("action", "TEMPLATE");
  googleCalendarUrl.searchParams.set("text", eventName);
  googleCalendarUrl.searchParams.set("dates", `${formatDate(startDate)}/${formatDate(endDate)}`);
  if (location) googleCalendarUrl.searchParams.set("location", location);
  if (eventDescription) googleCalendarUrl.searchParams.set("details", eventDescription);

  // Outlook Calendar (web)
  const outlookCalendarUrl = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  outlookCalendarUrl.searchParams.set("subject", eventName);
  outlookCalendarUrl.searchParams.set("startdt", startDate.toISOString());
  outlookCalendarUrl.searchParams.set("enddt", endDate.toISOString());
  if (location) outlookCalendarUrl.searchParams.set("location", location);
  if (eventDescription) outlookCalendarUrl.searchParams.set("body", eventDescription);

  // Yahoo Calendar
  const yahooCalendarUrl = new URL("https://calendar.yahoo.com/?v=60&view=d&type=20");
  yahooCalendarUrl.searchParams.set("title", eventName);
  yahooCalendarUrl.searchParams.set("st", formatDate(startDate));
  yahooCalendarUrl.searchParams.set("dur", String(Math.round((endDate.getTime() - startDate.getTime()) / 60000))); // Duration in minutes
  if (location) yahooCalendarUrl.searchParams.set("in_loc", location);
  if (eventDescription) yahooCalendarUrl.searchParams.set("desc", eventDescription);

  // Apple Calendar (.ics file)
  const generateICS = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CrowdStack//Event//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${startDate.getTime()}@crowdstack.app`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${eventName.replace(/[,;\\]/g, "\\$&")}`,
      location ? `LOCATION:${location.replace(/[,;\\]/g, "\\$&")}` : "",
      eventDescription ? `DESCRIPTION:${eventDescription.replace(/[,;\\\n]/g, (m) => m === "\n" ? "\\n" : "\\$&")}` : "",
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const calendarOptions = [
    {
      name: "Google Calendar",
      icon: "📅",
      action: () => {
        window.open(googleCalendarUrl.toString(), "_blank");
        setIsModalOpen(false);
      },
    },
    {
      name: "Apple Calendar",
      icon: "🍎",
      action: () => {
        generateICS();
        setIsModalOpen(false);
      },
    },
    {
      name: "Outlook",
      icon: "📧",
      action: () => {
        window.open(outlookCalendarUrl.toString(), "_blank");
        setIsModalOpen(false);
      },
    },
    {
      name: "Yahoo Calendar",
      icon: "📆",
      action: () => {
        window.open(yahooCalendarUrl.toString(), "_blank");
        setIsModalOpen(false);
      },
    },
  ];

  return (
    <>
      {compact ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-primary/50 transition-all text-sm font-medium"
        >
          <Calendar className="h-4 w-4" />
          Calendar
        </button>
      ) : (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
      </Button>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add to Calendar"
        size="sm"
      >
        <div className="space-y-2">
          {calendarOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.action}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-surface/50 transition-all text-left group"
            >
              <span className="text-2xl flex-shrink-0">{option.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {option.name}
                </div>
              </div>
              {option.name === "Apple Calendar" ? (
                <Download className="h-4 w-4 text-foreground-muted flex-shrink-0" />
              ) : (
                <ExternalLink className="h-4 w-4 text-foreground-muted flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

