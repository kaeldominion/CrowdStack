"use client";

import { Card, Badge } from "@crowdstack/ui";
import { Music, Shirt, Users, DollarSign } from "lucide-react";
import type { VenueTag } from "@crowdstack/shared/types";

interface VenueTagsProps {
  tags: VenueTag[];
}

const tagTypeConfig = {
  music: {
    icon: Music,
    label: "Music",
    variant: "primary" as const,
  },
  dress_code: {
    icon: Shirt,
    label: "Dress Code",
    variant: "secondary" as const,
  },
  crowd_type: {
    icon: Users,
    label: "Crowd",
    variant: "default" as const,
  },
  price_range: {
    icon: DollarSign,
    label: "Price Range",
    variant: "default" as const,
  },
};

export function VenueTags({ tags }: VenueTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  // Group tags by type
  const groupedTags = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.tag_type]) {
        acc[tag.tag_type] = [];
      }
      acc[tag.tag_type].push(tag);
      return acc;
    },
    {} as Record<string, VenueTag[]>
  );

  return (
    <Card>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Vibe</h2>
      <div className="space-y-6">
        {Object.entries(groupedTags).map(([type, typeTags]) => {
          const config = tagTypeConfig[type as keyof typeof tagTypeConfig];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-foreground-muted">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium uppercase tracking-wider">{config.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {typeTags.map((tag) => (
                  <Badge key={tag.id} variant={config.variant} size="md">
                    {tag.tag_value}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

