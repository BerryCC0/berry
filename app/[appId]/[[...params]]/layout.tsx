/**
 * App Route Layout
 * Generates metadata for SEO and social sharing
 * Supports dynamic OG images for proposals and candidates
 */

import type { Metadata } from "next";
import { osAppConfigs } from "@/OS/Apps/OSAppConfig";
import { GOLDSKY_ENDPOINT } from "@/app/lib/nouns/constants";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ appId: string; params?: string[] }>;
}

// Fetch proposal data for metadata
async function fetchProposalMeta(id: string) {
  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { proposal(id: "${id}") { id, title, description, status } }`,
      }),
      next: { revalidate: 60 },
    });
    const json = await response.json();
    return json.data?.proposal;
  } catch {
    return null;
  }
}

// Fetch candidate data for metadata by proposer + slug
async function fetchCandidateMeta(proposer: string, slug: string) {
  try {
    const id = `${proposer.toLowerCase()}-${slug}`;
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { proposalCandidate(id: "${id}") { slug, proposer, latestVersion { content { title, description } } } }`,
      }),
      next: { revalidate: 60 },
    });
    const json = await response.json();
    return json.data?.proposalCandidate;
  } catch {
    return null;
  }
}

// Fetch candidate data for metadata by slug only (clean URL format)
async function fetchCandidateMetaBySlug(slug: string) {
  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { proposalCandidates(where: { slug: "${slug}" }, first: 1) { slug, proposer, latestVersion { content { title, description } } } }`,
      }),
      next: { revalidate: 60 },
    });
    const json = await response.json();
    return json.data?.proposalCandidates?.[0] || null;
  } catch {
    return null;
  }
}

// Extract first ~160 chars as description
function extractDescription(text: string): string {
  // Strip markdown title if present
  let cleaned = text.replace(/^#\s*[^\n]+\n+/, '');
  // Strip other markdown syntax
  cleaned = cleaned.replace(/[#*_`>\[\]]/g, '');
  // Get first ~160 chars, ending at word boundary
  if (cleaned.length > 160) {
    cleaned = cleaned.slice(0, 160).replace(/\s+\S*$/, '') + '...';
  }
  return cleaned.trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string; params?: string[] }>;
}): Promise<Metadata> {
  const { appId, params: routeParams } = await params;
  const app = osAppConfigs.find((a) => a.id === appId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://berryos.wtf';

  // Default metadata
  const defaultMeta: Metadata = {
    title: app ? `${app.name} - Berry OS` : "Berry OS",
    description: app ? `Open ${app.name} in Berry OS` : "A Mac OS 8 recreation for the web",
    openGraph: {
      title: app ? `${app.name} - Berry OS` : "Berry OS",
      description: app ? `Open ${app.name} in Berry OS` : "A Mac OS 8 recreation for the web",
      images: ["/og/berry-os.png"],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: app ? `${app.name} - Berry OS` : "Berry OS",
      description: app ? `Open ${app.name} in Berry OS` : "A Mac OS 8 recreation for the web",
      images: ["/og/berry-os.png"],
    },
  };

  // Check for Camp app with specific routes
  if (appId === 'camp' && routeParams && routeParams.length > 0) {
    const [routeType, ...rest] = routeParams;

    // Proposal route: /camp/proposal/123
    if (routeType === 'proposal' && rest[0]) {
      const proposalId = rest[0];
      const proposal = await fetchProposalMeta(proposalId);
      
      if (proposal) {
        const title = `${proposal.title} - Prop ${proposal.id}`;
        const description = extractDescription(proposal.description);
        const ogImageUrl = `${baseUrl}/api/og/proposal/${proposalId}`;
        
        return {
          title: `${title} - Berry OS`,
          description,
          openGraph: {
            title,
            description,
            images: [ogImageUrl],
            type: "website",
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImageUrl],
          },
        };
      }
    }

    // Clean candidate route: /camp/c/{slug}
    if (routeType === 'c' && rest[0]) {
      const slug = rest.join('/');
      const candidate = await fetchCandidateMetaBySlug(slug);
      
      if (candidate) {
        const title = candidate.latestVersion?.content?.title || candidate.slug.replace(/-/g, ' ');
        const rawDescription = candidate.latestVersion?.content?.description || '';
        const proposer = candidate.proposer || '';
        const description = extractDescription(rawDescription) || `Proposal candidate by ${proposer.slice(0, 6)}...${proposer.slice(-4)}`;
        const ogImageUrl = `${baseUrl}/api/og/candidate/${proposer}/${slug}`;
        
        return {
          title: `${title} - Candidate - Berry OS`,
          description,
          openGraph: {
            title: `${title} (Candidate)`,
            description,
            images: [ogImageUrl],
            type: "website",
          },
          twitter: {
            card: "summary_large_image",
            title: `${title} (Candidate)`,
            description,
            images: [ogImageUrl],
          },
        };
      }
    }

    // Legacy candidate route: /camp/candidate/{proposer}/{slug}
    if (routeType === 'candidate' && rest[0] && rest[1]) {
      const proposer = rest[0];
      const slug = rest.slice(1).join('/');
      const candidate = await fetchCandidateMeta(proposer, slug);
      
      if (candidate) {
        const title = candidate.latestVersion?.content?.title || candidate.slug.replace(/-/g, ' ');
        const rawDescription = candidate.latestVersion?.content?.description || '';
        const description = extractDescription(rawDescription) || `Proposal candidate by ${proposer.slice(0, 6)}...${proposer.slice(-4)}`;
        const ogImageUrl = `${baseUrl}/api/og/candidate/${proposer}/${slug}`;
        
        return {
          title: `${title} - Candidate - Berry OS`,
          description,
          openGraph: {
            title: `${title} (Candidate)`,
            description,
            images: [ogImageUrl],
            type: "website",
          },
          twitter: {
            card: "summary_large_image",
            title: `${title} (Candidate)`,
            description,
            images: [ogImageUrl],
          },
        };
      }
    }
  }

  return defaultMeta;
}

export default async function AppRouteLayout({ children, params }: LayoutProps) {
  return <>{children}</>;
}
