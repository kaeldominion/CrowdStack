/**
 * Seed script for beta database - adds demo table bookings and pulse reviews
 * Run with: npx tsx scripts/seed-beta-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aiopjznxnoqgmmqowpxb.supabase.co',
  'sb_secret_0WBE7JkbdKhxPFMdeZNvow_j8D6U7yF'
);

// Guest names for realistic data
const guestNames = [
  'Michael Chen', 'Sarah Johnson', 'David Kim', 'Emma Watson', 'James Rodriguez',
  'Olivia Brown', 'William Taylor', 'Isabella Martinez', 'Alexander Davis', 'Sophia Wilson',
  'Benjamin Moore', 'Mia Anderson', 'Lucas Thomas', 'Charlotte Garcia', 'Henry White',
  'Amelia Jackson', 'Daniel Harris', 'Harper Lee', 'Matthew Clark', 'Evelyn Lewis'
];

const feedbackComments = {
  positive: [
    'Amazing night! The energy was incredible and the DJ absolutely killed it.',
    'Best venue in the city. Will definitely be back!',
    'Perfect atmosphere, great drinks, and wonderful service.',
    'Had the time of my life! Music was on point.',
    'Exceeded expectations. The VIP experience was worth every penny.',
    'What a fantastic event! Everything was perfectly organized.',
    'The vibe was immaculate. Staff were so friendly and professional.',
    'Incredible sound system and lighting. Top-notch production.',
  ],
  negative_freetext: [
    'Waited over 40 minutes in the queue despite having a reservation.',
    'Staff seemed overwhelmed and our table service was slow.',
    'Music was way too loud and not what was advertised.',
    'The crowd was very different from what we expected.',
    'Our table was in a poor location with limited visibility.',
    'Had issues getting our deposit back after the event.',
  ]
};

async function seedTableBookings() {
  console.log('🎯 Seeding table bookings...');

  // Get events that have tables available
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, name, venue_id, start_time,
      venues!inner(id, name)
    `)
    .gte('start_time', '2026-01-01')
    .order('start_time', { ascending: false })
    .limit(8);

  if (!events || events.length === 0) {
    console.log('No events found');
    return;
  }

  // Get tables for these venues
  const venueIds = [...new Set(events.map(e => e.venue_id))];
  const { data: tables } = await supabase
    .from('venue_tables')
    .select('id, name, venue_id, capacity, zone_id')
    .in('venue_id', venueIds);

  if (!tables || tables.length === 0) {
    console.log('No tables found for venues');
    return;
  }

  console.log(`Found ${events.length} events and ${tables.length} tables`);

  const bookings: any[] = [];
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
  const paymentStatuses = ['not_required', 'pending', 'paid', 'waived'];

  // Create varied bookings across events
  for (const event of events) {
    const eventTables = tables.filter(t => t.venue_id === event.venue_id);
    if (eventTables.length === 0) continue;

    // Create 2-5 bookings per event
    const numBookings = 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numBookings; i++) {
      const table = eventTables[Math.floor(Math.random() * eventTables.length)];
      const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const partySize = 2 + Math.floor(Math.random() * (table.capacity - 2));
      const depositRequired = Math.random() > 0.3 ? (500000 + Math.floor(Math.random() * 1500000)) : null;
      const minimumSpend = Math.random() > 0.4 ? (2000000 + Math.floor(Math.random() * 8000000)) : null;

      const booking: any = {
        event_id: event.id,
        table_id: table.id,
        guest_name: guestName,
        guest_email: `${guestName.toLowerCase().replace(' ', '.')}@example.com`,
        guest_whatsapp: `+62812${Math.floor(Math.random() * 90000000 + 10000000)}`,
        party_size: partySize,
        status,
        deposit_required: depositRequired,
        deposit_received: status === 'confirmed' || status === 'completed' ? Math.random() > 0.2 : false,
        minimum_spend: minimumSpend,
        payment_status: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        special_requests: Math.random() > 0.7 ? 'Birthday celebration - please prepare sparklers' : null,
      };

      // Add actual spend for completed bookings
      if (status === 'completed' && minimumSpend) {
        booking.actual_spend = minimumSpend + Math.floor(Math.random() * 3000000);
      }

      // Add confirmation details for confirmed/completed
      if (status === 'confirmed' || status === 'completed') {
        booking.confirmed_at = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
      }

      // Add staff notes sometimes
      if (Math.random() > 0.6) {
        const notes = [
          'VIP guest - provide premium service',
          'Repeat customer - previous booking went well',
          'First-time visitor - show them around',
          'Corporate booking - may want to extend',
          'Birthday group - coordinate with kitchen',
        ];
        booking.staff_notes = notes[Math.floor(Math.random() * notes.length)];
      }

      bookings.push(booking);
    }
  }

  // Insert bookings
  const { data: insertedBookings, error } = await supabase
    .from('table_bookings')
    .insert(bookings)
    .select('id, guest_name, status');

  if (error) {
    console.error('Error inserting bookings:', error);
    return;
  }

  console.log(`✅ Created ${insertedBookings?.length || 0} table bookings`);
  return insertedBookings;
}

async function seedPulseReviews() {
  console.log('🎯 Seeding pulse reviews (event feedback)...');

  // Get registrations with event and attendee info
  const { data: registrations } = await supabase
    .from('registrations')
    .select(`
      id, event_id, attendee_id,
      attendees!inner(id, user_id, name),
      events!inner(id, name, start_time)
    `)
    .not('attendees.user_id', 'is', null)
    .limit(50);

  if (!registrations || registrations.length === 0) {
    console.log('No registrations found with user_ids');
    return;
  }

  console.log(`Found ${registrations.length} registrations with users`);

  // Check which registrations already have feedback
  const regIds = registrations.map(r => r.id);
  const { data: existingFeedback } = await supabase
    .from('event_feedback')
    .select('registration_id')
    .in('registration_id', regIds);

  const existingRegIds = new Set(existingFeedback?.map(f => f.registration_id) || []);
  const availableRegs = registrations.filter(r => !existingRegIds.has(r.id));

  console.log(`${availableRegs.length} registrations available for feedback`);

  if (availableRegs.length === 0) {
    console.log('All registrations already have feedback');
    return;
  }

  const feedbackCategories = ['door_entry', 'staff', 'tables_service', 'music', 'crowd', 'other'];
  const feedbackItems: any[] = [];

  // Create feedback for a subset of registrations (simulating real-world response rate ~40%)
  const numFeedback = Math.min(Math.floor(availableRegs.length * 0.6), 25);
  const selectedRegs = availableRegs.slice(0, numFeedback);

  for (const reg of selectedRegs) {
    const attendee = reg.attendees as any;

    // Weighted rating distribution (more positive than negative)
    const ratingWeights = [0.05, 0.10, 0.15, 0.35, 0.35]; // 1-5 stars
    const random = Math.random();
    let cumulative = 0;
    let rating = 5;
    for (let i = 0; i < ratingWeights.length; i++) {
      cumulative += ratingWeights[i];
      if (random < cumulative) {
        rating = i + 1;
        break;
      }
    }

    const feedbackType = rating >= 4 ? 'positive' : 'negative';

    const feedback: any = {
      registration_id: reg.id,
      event_id: reg.event_id,
      attendee_id: reg.attendee_id,
      user_id: attendee.user_id,
      rating,
      feedback_type: feedbackType,
      submitted_at: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString(),
    };

    if (feedbackType === 'positive') {
      // Add positive comment (optional)
      if (Math.random() > 0.4) {
        feedback.comment = feedbackComments.positive[Math.floor(Math.random() * feedbackComments.positive.length)];
      }
      feedback.categories = [];
    } else {
      // Add categories for negative feedback
      const numCategories = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...feedbackCategories].sort(() => Math.random() - 0.5);
      feedback.categories = shuffled.slice(0, numCategories);

      // Add free text sometimes
      if (Math.random() > 0.5) {
        feedback.free_text = feedbackComments.negative_freetext[Math.floor(Math.random() * feedbackComments.negative_freetext.length)];
      }
    }

    // Mark some as resolved
    if (feedbackType === 'negative' && Math.random() > 0.6) {
      feedback.resolved_at = new Date().toISOString();
      feedback.internal_notes = 'Contacted guest and offered compensation for next visit.';
    }

    feedbackItems.push(feedback);
  }

  // Insert feedback
  const { data: insertedFeedback, error } = await supabase
    .from('event_feedback')
    .insert(feedbackItems)
    .select('id, rating, feedback_type');

  if (error) {
    console.error('Error inserting feedback:', error);
    console.error('First item attempted:', feedbackItems[0]);
    return;
  }

  console.log(`✅ Created ${insertedFeedback?.length || 0} pulse reviews`);

  // Summary
  const positive = insertedFeedback?.filter(f => f.feedback_type === 'positive').length || 0;
  const negative = insertedFeedback?.filter(f => f.feedback_type === 'negative').length || 0;
  const avgRating = insertedFeedback?.reduce((sum, f) => sum + f.rating, 0) / (insertedFeedback?.length || 1);

  console.log(`   📊 ${positive} positive, ${negative} negative (avg: ${avgRating.toFixed(1)}⭐)`);

  return insertedFeedback;
}

async function main() {
  console.log('🚀 Starting beta database seeding...\n');

  try {
    await seedTableBookings();
    console.log('');
    await seedPulseReviews();

    console.log('\n✨ Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
