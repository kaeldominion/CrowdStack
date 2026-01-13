import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { MePageClient } from "./MePageClient";

interface Registration {
  id: string;
  event_id: string;
  registered_at: string;
  qr_pass_token?: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    cover_image_url: string | null;
    flier_url?: string | null;
    venue?: {
      name: string;
      city: string | null;
    } | null;
  } | null;
  checkins?: { checked_in_at: string }[];
}

interface UserProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  username: string | null;
  avatar_url: string | null;
  xp_points: number;
  attendee_id: string | null;
  created_at: string | null;
}

interface XpProgressData {
  total_xp: number;
  level: number;
  xp_in_level: number;
  xp_for_next_level: number;
  progress_pct: number;
}

async function getUserData() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const serviceSupabase = createServiceRoleClient();

  // First get attendee to have attendee ID for registrations
  const attendeeResult = await serviceSupabase
    .from("attendees")
    .select("id, name, email, phone, user_id, avatar_url, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const attendee = attendeeResult.data;
  const attendeeId = attendee?.id;

  // Fetch XP data directly from ledger (more reliable than RPC)
  const xpLedgerResult = await serviceSupabase
    .from("xp_ledger")
    .select("amount")
    .eq("user_id", user.id);

  let totalXpFromLedger = 0;
  if (xpLedgerResult.data && xpLedgerResult.data.length > 0) {
    totalXpFromLedger = xpLedgerResult.data.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  } else if (attendeeId) {
    // Fallback: try old schema with attendee_id
    const oldSchemaResult = await serviceSupabase
      .from("xp_ledger")
      .select("amount")
      .eq("attendee_id", attendeeId);
    if (oldSchemaResult.data) {
      totalXpFromLedger = oldSchemaResult.data.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    }
  }

  // Calculate level from XP
  const levelResult = await serviceSupabase
    .rpc("calculate_level", { total_xp: totalXpFromLedger })
    .maybeSingle();

  // Fetch all other data in parallel (now that we have attendee ID)
  const [registrationsResult, favoritesResult, followingResult, tableBookingsResult] = await Promise.all([

    // Registrations with event and venue data (only if we have attendee ID)
    attendeeId
      ? serviceSupabase
          .from("registrations")
          .select(`
            id,
            event_id,
            registered_at,
            event:events(
              id,
              name,
              slug,
              start_time,
              end_time,
              cover_image_url,
              flier_url,
              venue:venues(name, city)
            ),
            checkins(checked_in_at)
          `)
          .eq("attendee_id", attendeeId)
          .order("registered_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    // Favorite venues
    serviceSupabase
      .from("venue_favorites")
      .select(`
        id,
        created_at,
        venue:venues(
          id,
          name,
          slug,
          logo_url,
          cover_image_url,
          city,
          state,
          venue_tags(tag_type, tag_value)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    // Followed DJs
    serviceSupabase
      .from("dj_follows")
      .select(`
        id,
        created_at,
        djs(
          id,
          handle,
          name,
          profile_image_url,
          genres,
          location
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    // Table bookings (if we have attendee ID)
    attendeeId
      ? serviceSupabase
          .from("table_bookings")
          .select(`
            id,
            status,
            guest_name,
            party_size,
            minimum_spend,
            deposit_required,
            deposit_received,
            slot_start_time,
            slot_end_time,
            arrival_deadline,
            created_at,
            event:events(
              id,
              name,
              slug,
              start_time,
              end_time,
              timezone,
              currency,
              venue:venues(id, name, slug, city, currency)
            ),
            table:venue_tables(
              id,
              name,
              zone:table_zones(id, name)
            )
          `)
          .eq("attendee_id", attendeeId)
          .in("status", ["pending", "confirmed", "completed"])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const registrations = (registrationsResult.data || []) as unknown as Registration[];

  // Process XP data
  const totalXp = totalXpFromLedger;
  let xpProgressData: XpProgressData | null = null;

  if (levelResult.data) {
    const levelData = levelResult.data as {
      level?: number;
      xp_in_level?: number;
      xp_for_next_level?: number;
      progress_pct?: number;
    };
    xpProgressData = {
      total_xp: totalXp,
      level: levelData.level || 1,
      xp_in_level: levelData.xp_in_level || 0,
      xp_for_next_level: levelData.xp_for_next_level || 100,
      progress_pct: Number(levelData.progress_pct) || 0,
    };
  } else {
    // Fallback level calculation if RPC fails
    const fallbackLevel = totalXp >= 100000 ? 10 :
                         totalXp >= 50000 ? 9 :
                         totalXp >= 35000 ? 8 :
                         totalXp >= 20000 ? 7 :
                         totalXp >= 10000 ? 6 :
                         totalXp >= 2500 ? 5 :
                         totalXp >= 1000 ? 4 :
                         totalXp >= 500 ? 3 :
                         totalXp >= 250 ? 2 : 1;
    xpProgressData = {
      total_xp: totalXp,
      level: fallbackLevel,
      xp_in_level: totalXp,
      xp_for_next_level: 100,
      progress_pct: 0,
    };
  }

  // Build profile
  const email = attendee?.email || user.email || "";
  const username = email.split("@")[0] || null;

  const profile: UserProfile = {
    name: attendee?.name || user.user_metadata?.name || null,
    email: attendee?.email || user.email || null,
    phone: attendee?.phone || null,
    username,
    avatar_url: attendee?.avatar_url || null,
    xp_points: totalXp,
    attendee_id: attendeeId || null,
    created_at: attendee?.created_at || user.created_at || null,
  };

  // Categorize registrations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const happeningNow: Registration[] = [];
  const today: Registration[] = [];
  const upcoming: Registration[] = [];
  const past: Registration[] = [];

  registrations.forEach((reg) => {
    if (!reg.event) return;
    const event = Array.isArray(reg.event) ? reg.event[0] : reg.event;
    const venue = event?.venue ? (Array.isArray(event.venue) ? event.venue[0] : event.venue) : null;
    if (!event) return;
    
    const startTime = new Date(event.start_time);
    const endTime = event.end_time ? new Date(event.end_time) : null;
    const normalizedReg = { ...reg, event: { ...event, venue } };

    const hasStarted = startTime <= now;
    const isToday = startTime >= todayStart && startTime < todayEnd;
    const hasEnded = endTime ? endTime < now : (hasStarted && startTime < hoursAgo24);
    const isHappeningNow = hasStarted && !hasEnded && startTime >= hoursAgo24;
    
    if (hasEnded) past.push(normalizedReg);
    else if (isHappeningNow) happeningNow.push(normalizedReg);
    else if (isToday) today.push(normalizedReg);
    else if (startTime > now) upcoming.push(normalizedReg);
    else past.push(normalizedReg);
  });

  happeningNow.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
  today.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
  upcoming.sort((a, b) => new Date(a.event?.start_time || 0).getTime() - new Date(b.event?.start_time || 0).getTime());
  past.sort((a, b) => new Date(b.event?.start_time || 0).getTime() - new Date(a.event?.start_time || 0).getTime());

  // Process favorite venues
  const favoriteVenues = (favoritesResult.data || [])
    .filter((f: any) => f.venue)
    .map((f: any) => {
      const venue = Array.isArray(f.venue) ? f.venue[0] : f.venue;
      const tags = venue.venue_tags || [];
      return {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        logo_url: venue.logo_url,
        cover_image_url: venue.cover_image_url,
        city: venue.city,
        state: venue.state,
        tags: tags,
      };
    });

  // Process followed DJs
  const followedDJs = (followingResult.data || [])
    .map((f: any) => {
      const dj = Array.isArray(f.djs) ? f.djs[0] : f.djs;
      return dj;
    })
    .filter(Boolean);

  // Process table bookings - separate into upcoming and past
  const tableBookings = (tableBookingsResult.data || []).map((booking: any) => {
    const event = Array.isArray(booking.event) ? booking.event[0] : booking.event;
    const table = Array.isArray(booking.table) ? booking.table[0] : booking.table;
    const venue = event?.venue ? (Array.isArray(event.venue) ? event.venue[0] : event.venue) : null;
    const zone = table?.zone ? (Array.isArray(table.zone) ? table.zone[0] : table.zone) : null;

    return {
      id: booking.id,
      status: booking.status,
      guest_name: booking.guest_name,
      party_size: booking.party_size,
      minimum_spend: booking.minimum_spend,
      deposit_required: booking.deposit_required,
      deposit_received: booking.deposit_received,
      slot_start_time: booking.slot_start_time,
      slot_end_time: booking.slot_end_time,
      arrival_deadline: booking.arrival_deadline,
      created_at: booking.created_at,
      event: event ? {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        timezone: event.timezone,
        currency: event.currency,
      } : null,
      venue: venue ? {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        city: venue.city,
        currency: venue.currency,
      } : null,
      table: table ? {
        id: table.id,
        name: table.name,
        zone_name: zone?.name || null,
      } : null,
    };
  });

  // Separate upcoming and past table bookings
  const upcomingTableBookings = tableBookings.filter((b: any) => {
    if (!b.event?.start_time) return false;
    const eventStart = new Date(b.event.start_time);
    return eventStart > now && b.status !== "completed";
  });

  const pastTableBookings = tableBookings.filter((b: any) => {
    if (!b.event?.start_time) return b.status === "completed";
    const eventStart = new Date(b.event.start_time);
    return eventStart <= now || b.status === "completed";
  });

  return {
    profile,
    xpData: xpProgressData,
    happeningNowEvents: happeningNow,
    todayEvents: today,
    upcomingEvents: upcoming,
    pastEvents: past,
    favoriteVenues,
    followedDJs,
    upcomingTableBookings,
    pastTableBookings,
  };
}

export default async function MePage() {
  const data = await getUserData();

  return <MePageClient {...data} />;
}
