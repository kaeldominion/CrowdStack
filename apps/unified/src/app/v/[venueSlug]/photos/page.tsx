import { notFound } from "next/navigation";
import { Card } from "@crowdstack/ui";
import { Camera } from "lucide-react";
import Link from "next/link";

async function getVenue(slug: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${slug}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.venue;
  } catch (error) {
    console.error("Failed to fetch venue:", error);
    return null;
  }
}

export default async function VenuePhotosPage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const venue = await getVenue(params.venueSlug);

  if (!venue) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12">
        {/* Back Link */}
        <Link
          href={`/v/${params.venueSlug}`}
          className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-8"
        >
          ← Back to {venue.name}
        </Link>

        {/* Coming Soon Card */}
        <Card className="!p-12 text-center border-dashed">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-raised border-4 border-border-strong flex items-center justify-center">
            <Camera className="h-8 w-8 text-accent-secondary" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-2">
            Photos Coming Soon
          </h1>

          <p className="text-secondary mb-6">
            Photos from events at <span className="text-primary font-medium">{venue.name}</span> will be available here soon.
          </p>
        </Card>
      </div>
    </div>
  );
}

