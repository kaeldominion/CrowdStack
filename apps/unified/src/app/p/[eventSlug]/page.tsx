export default async function PhotosPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  // TODO: Fetch photos for event
  const photos: any[] = [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Event Photos
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Photos from {params.eventSlug}
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No photos available yet.</p>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="aspect-square rounded-lg bg-gray-200">
              {/* Photo would be displayed here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

