export default async function VenueEventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  // TODO: Fetch event details

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Event Details</h1>
      <p className="mt-4 text-gray-600">Event ID: {params.eventId}</p>
    </div>
  );
}

