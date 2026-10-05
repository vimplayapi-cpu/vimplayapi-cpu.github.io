/** Shared domain types. Row shapes mirror the SQL schema exactly. */

export type StudioStatus = 'available' | 'limited' | 'in_production' | 'unavailable';
export type LeadStatus = 'new' | 'in_review' | 'contacted' | 'closed' | 'spam';
export type ImageRole = 'wide' | 'alt' | 'detail' | 'tech';
export type MediaKind = 'image' | 'video';

export const STUDIO_STATUS_LABEL: Record<StudioStatus, string> = {
  available: 'Available',
  limited: 'Limited availability',
  in_production: 'In production',
  unavailable: 'Unavailable',
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  in_review: 'In review',
  contacted: 'Contacted',
  closed: 'Closed',
  spam: 'Spam',
};

/** Everything needed to render a responsive <picture> without a layout shift. */
export interface ImageAsset {
  id: number | null;
  avif: string;
  webp: string;
  avifSrcSet: string;
  webpSrcSet: string;
  width: number;
  height: number;
  lqip: string;
  dominant: string;
  alt: string;
  caption: string;
}

export interface VideoAsset {
  id: number;
  src: string;
  mime: string;
  poster: ImageAsset | null;
  title: string;
  caption: string;
  durationSeconds: number | null;
}

export interface StudioImage extends ImageAsset {
  role: ImageRole;
  roleLabel: string;
  position: number;
}

export interface TechSpec {
  label: string;
  value: string;
}

export interface Studio {
  id: number;
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  environment: string;
  capacity: string;
  characteristics: string[];
  capabilities: TechSpec[];
  status: StudioStatus;
  statusLabel: string;
  availabilityNote: string;
  accent: string;
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  sortOrder: number;
  location: LocationSummary | null;
  images: StudioImage[];
  video: VideoAsset | null;
}

export interface LocationSummary {
  id: number;
  slug: string;
  country: string;
  countryCode: string;
  city: string;
}

export interface Location extends LocationSummary {
  address: string;
  email: string;
  phone: string;
  studioAvailability: string;
  services: string[];
  mapX: number;
  mapY: number;
  studioCount: number;
}

export interface ServiceInclusion {
  title: string;
  description: string;
}

export interface Service {
  id: number;
  slug: string;
  code: string;
  title: string;
  summary: string;
  body: string;
  inclusions: ServiceInclusion[];
  icon: string;
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  heroImage: ImageAsset | null;
  sortOrder: number;
}

export interface GalleryCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
}

export interface GalleryItem {
  id: number;
  title: string;
  caption: string;
  categorySlug: string;
  categoryName: string;
  studioSlug: string | null;
  image: ImageAsset;
}

export interface TimelineEvent {
  id: number;
  year: string;
  event: string;
  description: string;
  image: ImageAsset | null;
  sortOrder: number;
}

export interface SocialPost {
  id: number;
  platform: string;
  url: string;
  caption: string;
  image: ImageAsset | null;
}

export interface SeoRecord {
  route: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogImage: string | null;
}
