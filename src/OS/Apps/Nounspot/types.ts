'use client';

/**
 * Nounspot Types
 * Data structures for the Nounspot API
 */

export interface Spot {
  id: string;
  name: string;
  description: string | null;
  category: 'Places' | 'People' | 'Things';
  address: string;
  locationLat: number;
  locationLng: number;
  eventDate: string | null;
  eventTime: string | null;
  community: string[];
  photoUrl: string | null;
  contactLink: string | null;
  ownerEmail: string | null;
  ownerUserFid: string | null;
  ownerWalletId: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUsername: string | null;
  ownerWalletAddress: string | null;
}

export type SpotCategory = 'Places' | 'People' | 'Things' | 'All';

export interface NounspotRoute {
  view: 'map' | 'spot';
  spotId?: string;
  category?: SpotCategory;
}

/**
 * Parse a route string into a NounspotRoute
 */
export function parseRoute(path: string): NounspotRoute {
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'spot' && segments[1]) {
    return { view: 'spot', spotId: segments[1] };
  }

  return { view: 'map', category: 'All' };
}

/**
 * Convert a NounspotRoute to a path string
 */
export function routeToPath(route: NounspotRoute): string {
  if (route.view === 'spot' && route.spotId) {
    return `spot/${route.spotId}`;
  }
  return '';
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'Places':
      return '#e4497a'; // Pink
    case 'Things':
      return '#00b4d8'; // Cyan
    case 'People':
      return '#9d4edd'; // Purple
    default:
      return '#e4497a';
  }
}

