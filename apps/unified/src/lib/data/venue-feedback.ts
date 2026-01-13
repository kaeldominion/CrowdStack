import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "./get-user-entity";

export interface FeedbackItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  categories: string[];
  free_text?: string | null;
  submitted_at: string;
  attendee_id?: string | null;
  attendee_name?: string | null;
  event_id?: string;
  event_name?: string;
  event_date?: string;
  resolved_at?: string | null;
  internal_notes?: string | null;
}

export interface EventFeedbackStats {
  event_id: string;
  event_name: string;
  event_date?: string;
  total_feedback: number;
  average_rating: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  positive_count: number;
  negative_count: number;
  category_breakdown: Record<string, number>;
  feedback_items: FeedbackItem[];
}

export interface VenueFeedbackStats {
  total_feedback: number;
  average_rating: number;
  events_with_feedback: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  category_breakdown: Record<string, number>;
  recent_feedback: FeedbackItem[];
}

/**
 * Get feedback for a specific event
 */
export async function getEventFeedback(
  eventId: string
): Promise<EventFeedbackStats | null> {
  const venueId = await getUserVenueId();

  if (!venueId) {
    return null;
  }

  const supabase = createServiceRoleClient();

  // Verify event belongs to venue
  const { data: event } = await supabase
    .from("events")
    .select("id, name, start_time, venue_id")
    .eq("id", eventId)
    .eq("venue_id", venueId)
    .single();

  if (!event) {
    return null;
  }

  // Get all feedback for this event
  const { data: feedback, error } = await supabase
    .from("event_feedback")
    .select(`
      id,
      rating,
      feedback_type,
      comment,
      categories,
      free_text,
      submitted_at,
      resolved_at,
      internal_notes,
      attendee_id,
      attendees!inner(id, name)
    `)
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("[Venue Feedback] Error fetching feedback:", error);
    return null;
  }

  if (!feedback || feedback.length === 0) {
    return {
      event_id: eventId,
      event_name: event.name,
      event_date: event.start_time || undefined,
      total_feedback: 0,
      average_rating: 0,
      rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      positive_count: 0,
      negative_count: 0,
      category_breakdown: {},
      feedback_items: [],
    };
  }

  // Calculate stats
  const totalFeedback = feedback.length;
  const averageRating =
    feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;

  const ratingDistribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  let positiveCount = 0;
  let negativeCount = 0;
  const categoryBreakdown: Record<string, number> = {};

  const feedbackItems: FeedbackItem[] = feedback.map((f) => {
    // Update rating distribution
    ratingDistribution[f.rating.toString() as keyof typeof ratingDistribution]++;

    // Update positive/negative counts
    if (f.feedback_type === "positive") {
      positiveCount++;
    } else {
      negativeCount++;
    }

    // Parse categories
    let categories: string[] = [];
    if (f.categories) {
      try {
        categories =
          typeof f.categories === "string"
            ? JSON.parse(f.categories)
            : f.categories;
      } catch {
        categories = [];
      }
    }

    // Update category breakdown
    categories.forEach((cat) => {
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    const attendee = Array.isArray(f.attendees)
      ? f.attendees[0]
      : f.attendees;

    return {
      id: f.id,
      rating: f.rating,
      feedback_type: f.feedback_type,
      comment: f.comment,
      categories,
      free_text: f.free_text,
      submitted_at: f.submitted_at,
      attendee_id: f.attendee_id || null,
      attendee_name: attendee?.name || null,
      resolved_at: f.resolved_at || null,
      internal_notes: f.internal_notes || null,
    };
  });

  return {
    event_id: eventId,
    event_name: event.name,
    event_date: event.start_time || undefined,
    total_feedback: totalFeedback,
    average_rating: Math.round(averageRating * 10) / 10,
    rating_distribution: ratingDistribution,
    positive_count: positiveCount,
    negative_count: negativeCount,
    category_breakdown: categoryBreakdown,
    feedback_items: feedbackItems,
  };
}

/**
 * Get aggregated feedback stats for a venue across all events
 */
export async function getVenueFeedbackStats(): Promise<VenueFeedbackStats | null> {
  const venueId = await getUserVenueId();

  if (!venueId) {
    return null;
  }

  const supabase = createServiceRoleClient();

  // Get all events for the venue
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venueId);

  if (!events || events.length === 0) {
    return {
      total_feedback: 0,
      average_rating: 0,
      events_with_feedback: 0,
      rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      category_breakdown: {},
      recent_feedback: [],
    };
  }

  const eventIds = events.map((e) => e.id);

  // Get all feedback for venue events
  const { data: feedback, error } = await supabase
    .from("event_feedback")
    .select(`
      id,
      rating,
      feedback_type,
      comment,
      categories,
      free_text,
      submitted_at,
      resolved_at,
      internal_notes,
      attendee_id,
      event_id,
      attendees!inner(id, name),
      events!inner(id, name, start_time)
    `)
    .in("event_id", eventIds)
    .order("submitted_at", { ascending: false })
    .limit(50); // Recent feedback only

  if (error) {
    console.error("[Venue Feedback] Error fetching feedback:", error);
    return null;
  }

  if (!feedback || feedback.length === 0) {
    return {
      total_feedback: 0,
      average_rating: 0,
      events_with_feedback: 0,
      rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      category_breakdown: {},
      recent_feedback: [],
    };
  }

  // Get total count (may be more than 50)
  const { count } = await supabase
    .from("event_feedback")
    .select("*", { count: "exact", head: true })
    .in("event_id", eventIds);

  const totalFeedback = count || feedback.length;

  // Calculate stats
  const averageRating =
    feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

  const ratingDistribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  const categoryBreakdown: Record<string, number> = {};
  const eventsWithFeedback = new Set<string>();

  const recentFeedback: FeedbackItem[] = feedback.map((f) => {
    eventsWithFeedback.add(f.event_id);

    // Update rating distribution
    ratingDistribution[f.rating.toString() as keyof typeof ratingDistribution]++;

    // Parse categories
    let categories: string[] = [];
    if (f.categories) {
      try {
        categories =
          typeof f.categories === "string"
            ? JSON.parse(f.categories)
            : f.categories;
      } catch {
        categories = [];
      }
    }

    // Update category breakdown
    categories.forEach((cat) => {
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    const attendee = Array.isArray(f.attendees)
      ? f.attendees[0]
      : f.attendees;
    
    const event = Array.isArray(f.events)
      ? f.events[0]
      : f.events;

    return {
      id: f.id,
      rating: f.rating,
      feedback_type: f.feedback_type,
      comment: f.comment,
      categories,
      free_text: f.free_text,
      submitted_at: f.submitted_at,
      attendee_id: f.attendee_id || null,
      attendee_name: attendee?.name || null,
      event_id: f.event_id,
      event_name: event?.name || null,
      event_date: event?.start_time || null,
      resolved_at: f.resolved_at || null,
      internal_notes: f.internal_notes || null,
    };
  });

  return {
    total_feedback: totalFeedback,
    average_rating: Math.round(averageRating * 10) / 10,
    events_with_feedback: eventsWithFeedback.size,
    rating_distribution: ratingDistribution,
    category_breakdown: categoryBreakdown,
    recent_feedback: recentFeedback,
  };
}
