"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowRight } from "lucide-react";
import { Badge } from "@crowdstack/ui";

export function EventShowcaseCard({ event, index }: { event: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={`/e/${event.slug}`}>
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle hover:border-accent-primary/50 transition-all duration-500 shadow-soft hover:shadow-xl hover:shadow-accent-primary/10">
          {/* Image */}
          <div className="relative aspect-[3/4] min-h-[380px]">
            <Image
              src={event.image}
              alt={event.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Floating badge */}
            <motion.div
              className="absolute top-4 left-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
            >
              <Badge 
                color="purple" 
                variant="solid" 
                className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold backdrop-blur-sm"
              >
                {event.spotsLeft <= 20 ? "SELLING FAST" : "FEATURED"}
              </Badge>
            </motion.div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
              {/* Date & Time */}
              <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider">
                {event.date} • {event.time}
              </p>
              
              {/* Event Name */}
              <h3 className="font-sans text-2xl font-black text-primary uppercase tracking-tight leading-tight group-hover:text-white transition-colors duration-300">
                {event.name}
              </h3>
              
              {/* Venue */}
              <div className="flex items-center gap-1.5 text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">@ {event.venue}, {event.city}</span>
              </div>
              
              {/* Spots left */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  event.spotsLeft <= 20 ? "text-accent-warning" : "text-accent-success"
                }`}>
                  {event.spotsLeft} spots left
                </span>
                <span className="text-xs text-muted">
                  {event.capacity} capacity
                </span>
              </div>
              
              {/* CTA Button */}
              <motion.button
                className="w-full bg-accent-primary text-void font-mono font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-accent-primary/90 transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Join Guestlist
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

