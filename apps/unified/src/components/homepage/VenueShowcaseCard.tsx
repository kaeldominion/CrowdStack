"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@crowdstack/ui";

export function VenueShowcaseCard({ venue, index }: { venue: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <Link href={`/v/${venue.slug}`}>
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle hover:border-accent-secondary/50 transition-all duration-500 shadow-soft hover:shadow-lg bg-glass">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <Image
              src={venue.image}
              alt={venue.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-sans text-lg font-bold text-primary group-hover:text-accent-secondary transition-colors duration-300">
                {venue.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">{venue.city}, {venue.country}</span>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {venue.tags.map((tag: string, i: number) => (
                <Badge 
                  key={i}
                  color="blue" 
                  variant="outline" 
                  className="!rounded-full !px-2.5 !py-0.5 !text-[9px] !font-bold !uppercase !tracking-wider"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

