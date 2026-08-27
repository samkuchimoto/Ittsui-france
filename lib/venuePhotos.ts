// /lib/venuePhotos.ts
// Single source of truth for "which real photo represents this venue
// type" — this exact mapping used to be copy-pasted independently in
// DashboardClient.tsx, RequestFormClient.tsx, and request/[requestId]'s
// VenuePreviewCard. The third copy was the one that was never actually
// written (a bare {value, label} tile with no image at all), so it
// silently depended on the AI-mood-illustration fallback, which has no
// FAL_API_KEY in production — a real, live blank-photo bug found
// 2026-08-27. One shared map means a new venue type, or a swapped photo,
// can't drift out of sync across call sites again the same way.
import type { VenueType } from "@/lib/types";

export const VENUE_PHOTOS: Partial<Record<VenueType, string>> = {
  cafe: "/friends-cafe-terrace.jpg",
  park: "/grandmother-granddaughter-park.jpg",
  home: "/couple-living-room.jpg",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  museum: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80",
};
