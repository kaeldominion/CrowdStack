"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@crowdstack/ui";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Image from "next/image";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status?: string | null;
  flier_url: string | null;
  cover_image_url: string | null;
  registrations?: number;
  checkins?: number;
  organizer?: {
    id: string;
    name: string;
  };
}

interface EventsCalendarViewProps {
  events: Event[];
  getStatusBadge?: (status: string, event?: Event) => React.ReactNode;
  getApprovalBadge?: (status: string | null) => React.ReactNode;
  onEventClick?: (eventId: string) => void;
}

export function EventsCalendarView({
  events,
  getStatusBadge,
  getApprovalBadge,
  onEventClick,
}: EventsCalendarViewProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get first day of current month and how many days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.start_time);
      const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Check if date is in the past
  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    return date < new Date() && !isToday(day);
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handleEventClick = (eventId: string) => {
    if (onEventClick) {
      onEventClick(eventId);
    } else {
      router.push(`/app/venue/events/${eventId}`);
    }
  };

  return (
    <Card>
      <div className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-lg hover:bg-active text-secondary hover:text-primary transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-primary min-w-[200px] text-center">
              {monthName}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-active text-secondary hover:text-primary transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-active hover:bg-active/80 text-primary transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-secondary"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDate[dateKey] || [];
            const isTodayDate = isToday(day);
            const isPastDate = isPast(day);

            return (
              <div
                key={day}
                className={`aspect-square border border-border-subtle rounded-lg p-1.5 overflow-y-auto ${
                  isTodayDate
                    ? "bg-accent-primary/10 border-accent-primary/30"
                    : isPastDate
                    ? "bg-glass/30 opacity-60"
                    : "bg-glass hover:bg-active/50"
                } transition-colors`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isTodayDate ? "text-accent-primary" : "text-primary"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => {
                    const eventDate = new Date(event.start_time);
                    const timeStr = eventDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event.id);
                        }}
                        className="group cursor-pointer rounded p-1.5 bg-active hover:bg-active/80 border border-border-subtle hover:border-accent-primary/30 transition-all"
                        title={`${event.name} - ${timeStr}`}
                      >
                        <div className="flex items-start gap-1.5">
                          {(event.flier_url || event.cover_image_url) && (
                            <div className="w-6 h-8 rounded overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
                              <Image
                                src={event.flier_url || event.cover_image_url || ""}
                                alt={event.name}
                                width={24}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-primary truncate group-hover:text-accent-secondary transition-colors">
                              {event.name}
                            </div>
                            <div className="text-[9px] text-secondary mt-0.5">
                              {timeStr}
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {getApprovalBadge && event.venue_approval_status && getApprovalBadge(event.venue_approval_status)}
                              {getStatusBadge && getStatusBadge(event.status, event)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-secondary text-center pt-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
