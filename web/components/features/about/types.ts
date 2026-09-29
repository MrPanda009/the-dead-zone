import React from 'react';

/**
 * Data definition for an individual feature pillar column.
 */
export interface AboutPillarItemData {
  /** Identifier key */
  id: string;
  /** Pillar title */
  title: string;
  /** Descriptive body copy */
  description: string;
  /** Action link label (e.g. 'Explore Triage →') */
  actionLabel: string;
  /** Action link href */
  actionHref: string;
  /** Optional icon node or preset key */
  icon?: React.ReactNode;
}

/**
 * Props for an individual pillar column component.
 */
export interface AboutPillarItemProps {
  /** Pillar configuration and copy */
  data: AboutPillarItemData;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    iconWrapper?: string;
    title?: string;
    description?: string;
    link?: string;
  };
  /** Click handler */
  onClick?: (data: AboutPillarItemData) => void;
}

/**
 * Props for the elevated 3-pillar card overlapping the hero.
 */
export interface AboutPillarsCardProps {
  /** Centered display headline in the card */
  headline?: React.ReactNode;
  /** List of 3 pillar items */
  pillars?: AboutPillarItemData[];
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    headline?: string;
    grid?: string;
  };
}

/**
 * Props for the AboutHero component featuring the 3D rotating globe backdrop.
 */
export interface AboutHeroProps {
  /** Eyebrow badge text */
  eyebrow?: string;
  /** Main display headline */
  headline?: React.ReactNode;
  /** Secondary supporting copy */
  description?: React.ReactNode;
  /** Whether the globe should auto-rotate */
  isGlobeRotating?: boolean;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    eyebrow?: string;
    headline?: string;
    description?: string;
    globeContainer?: string;
  };
  /** Animation control overrides */
  animation?: {
    disabled?: boolean;
    delay?: number;
    duration?: number;
  };
}

/**
 * Props for alternating split narrative sections with organic curved imagery.
 */
export interface AboutSplitSectionProps {
  /** Small category / eyebrow tag (e.g. 'About TERRA' or 'Our Approach') */
  eyebrow: string;
  /** Main editorial headline */
  headline: React.ReactNode;
  /** Detailed paragraph copy */
  description: React.ReactNode;
  /** Image source path */
  imageSrc: string;
  /** Image alt text */
  imageAlt: string;
  /** Layout position of the image */
  imagePosition?: 'left' | 'right';
  /** Organic corner style for the image */
  cornerStyle?: 'top-left-arch' | 'top-right-arch' | 'pill';
  /** CTA button label */
  actionLabel?: string;
  /** CTA button link href */
  actionHref?: string;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    textContent?: string;
    eyebrow?: string;
    headline?: string;
    description?: string;
    button?: string;
    imageContainer?: string;
  };
}

/**
 * Data definition for an institutional partner logo.
 */
export interface AboutPartnerLogoData {
  /** Partner ID */
  id: string;
  /** Acronym / short name (e.g. 'NDRF', 'ISRO') */
  name: string;
  /** Full descriptive title */
  fullName: string;
  /** Category or role */
  category?: string;
}

/**
 * Props for an individual partner logo badge.
 */
export interface AboutLogoItemProps {
  data: AboutPartnerLogoData;
  className?: string;
}

/**
 * Props for the institutional partners strip.
 */
export interface AboutLogosStripProps {
  /** Optional section caption or label */
  label?: string;
  /** List of partner logos */
  partners?: AboutPartnerLogoData[];
  /** Custom root className */
  className?: string;
}

/**
 * Social links for a team member.
 */
export interface TeamMemberSocials {
  github?: string;
  linkedin?: string;
  email?: string;
  portfolio?: string;
}

/**
 * Data definition for a member of Team Triple T.
 */
export interface TeamMemberData {
  /** Member unique identifier */
  id: string;
  /** Full name */
  name: string;
  /** Optional index identifier, e.g. '01' */
  index?: string;
}

/**
 * Props for an individual team member card.
 */
export interface AboutTeamMemberCardProps {
  /** Member information */
  member: TeamMemberData;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    index?: string;
    name?: string;
  };
}

/**
 * Props for the Team Triple T section.
 */
export interface AboutTeamSectionProps {
  /** Team name (defaults to 'Triple T') */
  teamName?: string;
  /** Eyebrow label */
  eyebrow?: string;
  /** Section headline */
  headline?: React.ReactNode;
  /** Section description */
  description?: React.ReactNode;
  /** List of team members */
  members?: TeamMemberData[];
  /** Custom root className */
  className?: string;
}

/**
 * Props for the bottom quote / mission pledge card.
 */
export interface AboutQuoteBannerProps {
  /** Editorial quote text */
  quote?: string;
  /** Quoted entity or individual */
  author?: string;
  /** Role or organizational attribution */
  affiliation?: string;
  /** Custom root className */
  className?: string;
}

/**
 * Data definition for an editorial feature card on the About page.
 */
export interface AboutFeatureCardData {
  /** Two-digit index label, e.g. '01', '02', '03' */
  index: string;
  /** Small uppercase category name, e.g. 'OUR MISSION' */
  category: string;
  /** Image source path */
  imageSrc: string;
  /** Image alt text */
  imageAlt: string;
  /** Bold editorial heading */
  title: string;
  /** Descriptive narrative copy */
  description: string;
  /** Action button label, e.g. 'A SAFER TOMORROW' */
  actionLabel: string;
  /** Optional link destination */
  actionHref?: string;
  /** Optional custom badge label inside image */
  badgeText?: string;
  /** Optional overlay text lines in image */
  overlayLines?: string[];
}

/**
 * Props for a single editorial feature card.
 */
export interface AboutFeatureCardProps {
  /** Card configuration and content */
  data: AboutFeatureCardData;
  /** Optional custom click handler */
  onActionClick?: (data: AboutFeatureCardData) => void;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    header?: string;
    index?: string;
    category?: string;
    imageContainer?: string;
    image?: string;
    content?: string;
    title?: string;
    description?: string;
    footer?: string;
    actionButton?: string;
    actionLabel?: string;
  };
  /** Animation control overrides */
  animation?: {
    disabled?: boolean;
    delay?: number;
    duration?: number;
  };
}

/**
 * Props for the 3-column feature grid.
 */
export interface AboutFeatureGridProps {
  /** Custom card data list; defaults to canonical 3 cards */
  cards?: AboutFeatureCardData[];
  /** Optional action callback */
  onCardAction?: (card: AboutFeatureCardData) => void;
  /** Custom root className */
  className?: string;
  /** Animation control overrides */
  animation?: {
    disabled?: boolean;
    delay?: number;
    stagger?: number;
  };
}

/**
 * Props for the atmospheric background backdrop.
 */
export interface AboutAtmosphereProps {
  /** Optional custom backdrop image url */
  backdropUrl?: string;
  /** Base opacity for the image layer */
  backdropOpacity?: number;
  /** Whether to render floating mist particles/layer */
  enableMist?: boolean;
  /** Custom root className */
  className?: string;
}

/**
 * Props for decorative geospatial metadata markings (coordinates, crosshair, editorial labels).
 */
export interface AboutMetadataMarkingsProps {
  /** Latitude coordinate string */
  latitude?: string;
  /** Longitude coordinate string */
  longitude?: string;
  /** Spaced editorial pillar words */
  editorialPillars?: string[];
  /** Custom root className */
  className?: string;
}

/**
 * Props for the ScrollReveal dynamic scroll-trigger wrapper.
 */
export interface ScrollRevealProps {
  /** Child content to animate */
  children: React.ReactNode;
  /** Direction from which the element appears ('left' | 'right' | 'up' | 'down' | 'none') */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels to animate on translation axis */
  distance?: number;
  /** Duration of animation in seconds */
  duration?: number;
  /** Delay in seconds before animating */
  delay?: number;
  /** Stagger in seconds for direct child items if batching */
  stagger?: number;
  /** Custom ease curve */
  ease?: string;
  /** Viewport intersection threshold (0.0 to 1.0) */
  threshold?: number;
  /** Custom root className */
  className?: string;
  /** HTML element type */
  as?: keyof React.JSX.IntrinsicElements;
}
