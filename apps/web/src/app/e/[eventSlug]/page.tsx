import Link from "next/link";
import { Container, Section, Button, Card } from "@crowdstack/ui";
import { Calendar, MapPin } from "lucide-react";

export default async function EventPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  // TODO: Fetch event data
  const event = {
    name: "Sample Event",
    description: "This is a sample event description.",
    start_time: new Date().toISOString(),
    venue: "Sample Venue",
  };

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="xl">
        <Container size="md">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {event.name}
            </h1>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
              {event.description}
            </p>

            <Card className="mt-8 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-foreground-muted">
                  <Calendar className="h-5 w-5" />
                  <span>{new Date(event.start_time).toLocaleDateString("en-US", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}</span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-3 text-foreground-muted">
                    <MapPin className="h-5 w-5" />
                    <span>{event.venue}</span>
                  </div>
                )}
              </div>
            </Card>

            <div className="mt-8">
              <Link href={`/e/${params.eventSlug}/register`}>
                <Button variant="primary" size="lg">
                  Register Now
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

