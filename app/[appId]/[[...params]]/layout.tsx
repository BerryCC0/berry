/**
 * App Route Layout
 * Generates metadata for SEO and social sharing
 * Supports dynamic OG images for proposals and candidates
 */

import type { Metadata } from "next";
import { osAppConfigs } from "@/OS/Apps/OSAppConfig";
import { ponderSql } from '@/app/lib/ponder-db';
import { getTraitName } from '@/app/lib/nouns/utils/trait-name-utils';
import { CLIENT_NAMES } from '@/OS/lib/clientNames';
import { slugifyClientName } from '@/OS/Apps/Clients/types';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ appId: string; params?: string[] }>;
}

// Fetch proposal data for metadata from Ponder
async function fetchProposalMeta(id: string) {
  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT id, title, description, status
      FROM ponder_live.proposals
      WHERE id = ${parseInt(id)}
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Fetch candidate data for metadata by proposer + slug from Ponder
async function fetchCandidateMeta(proposer: string, slug: string) {
  try {
    const candidateId = `${proposer.toLowerCase()}-${slug}`;
    const sql = ponderSql();
    const rows = await sql`
      SELECT id, slug, proposer, title, description
      FROM ponder_live.candidates
      WHERE id = ${candidateId}
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Fetch candidate data for metadata by slug only (clean URL format)
async function fetchCandidateMetaBySlug(slug: string) {
  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT id, slug, proposer, title, description
      FROM ponder_live.candidates
      WHERE slug = ${slug}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Resolve a client ID or name slug to metadata for OG tags
async function resolveClientMeta(param: string, baseUrl: string): Promise<{
  clientId: number;
  name: string;
  description: string;
  ogImageUrl: string;
} | null> {
  try {
    const sql = ponderSql();
    const numId = parseInt(param, 10);

    let clientId: number | null = null;

    if (!isNaN(numId) && numId >= 0) {
      // Direct numeric ID
      clientId = numId;
    } else {
      // Try to resolve slug from CLIENT_NAMES registry
      for (const [idStr, name] of Object.entries(CLIENT_NAMES)) {
        if (slugifyClientName(name) === param) {
          clientId = Number(idStr);
          break;
        }
      }

      // If not in registry, try DB lookup by slugified name
      if (clientId === null) {
        const rows = await sql`
          SELECT client_id, name
          FROM ponder_live.clients
          ORDER BY total_rewarded DESC NULLS LAST
        `;
        for (const row of rows) {
          if (slugifyClientName(row.name || '') === param) {
            clientId = row.client_id;
            break;
          }
        }
      }
    }

    if (clientId === null) return null;

    // Fetch client data + aggregated counts from separate tables
    const [clientRowsResult, voteResult, proposalResult] = await Promise.all([
      sql`
        SELECT client_id, name, description,
               total_rewarded::text as total_rewarded,
               total_withdrawn::text as total_withdrawn,
               block_timestamp::text as block_timestamp
        FROM ponder_live.clients
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT COALESCE(SUM(votes), 0)::int as vote_count
        FROM ponder_live.client_votes
        WHERE client_id = ${clientId}
      `,
      sql`
        SELECT COUNT(*)::int as proposal_count
        FROM ponder_live.proposals
        WHERE client_id = ${clientId}
      `,
    ]);
    if (clientRowsResult.length === 0) return null;

    const c = clientRowsResult[0];
    const name = CLIENT_NAMES[clientId] ?? (c.name || `Client ${clientId}`);
    const rewarded = Number(BigInt(c.total_rewarded || '0')) / 1e18;
    const ethStr = rewarded >= 1 ? rewarded.toFixed(2) : rewarded.toFixed(4);
    const voteCount = voteResult[0]?.vote_count ?? 0;
    const proposalCount = proposalResult[0]?.proposal_count ?? 0;
    const description = `${name} (Client #${clientId}) — ${ethStr} ETH rewarded, ${voteCount} votes, ${proposalCount} proposals.`;

    return {
      clientId,
      name,
      description,
      ogImageUrl: `${baseUrl}/api/og/clients/${clientId}`,
    };
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

// App ID aliases (must match page.tsx)
const APP_ALIASES: Record<string, string> = {
  'auction': 'nouns-auction',
  'treasury': 'treasury',
  'wallet': 'wallet-panel',
  'noc': 'crystal-ball',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string; params?: string[] }>;
}): Promise<Metadata> {
  const { appId: rawAppId, params: routeParams } = await params;
  // Resolve aliases
  const appId = APP_ALIASES[rawAppId] || rawAppId;
  const app = osAppConfigs.find((a) => a.id === appId);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://berryos.wtf';

  // Special metadata for Crystal Ball (Noun O' Clock)
  if (appId === 'crystal-ball') {
    const ogImageUrl = `${baseUrl}/api/og/crystal-ball`;
    return {
      title: "Noun O' Clock - Berry OS",
      description: "Settle the next Noun.",
      openGraph: {
        title: "Noun O' Clock",
        description: "Settle the next Noun.",
        images: [ogImageUrl],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Noun O' Clock",
        description: "Settle the next Noun.",
        images: [ogImageUrl],
      },
    };
  }

  // Client Incentives metadata
  if (appId === 'clients') {
    // Check for individual client route: /clients/{idOrName} or /clients/{idOrName}/{tab}
    if (routeParams && routeParams.length > 0) {
      const firstParam = routeParams[0];
      // Dashboard tabs don't get individual metadata
      const dashboardTabs = new Set(['auctions', 'proposals', 'leaderboard']);
      if (!dashboardTabs.has(firstParam)) {
        const clientMeta = await resolveClientMeta(firstParam, baseUrl);
        if (clientMeta) {
          const tab = routeParams[1] || null;
          const tabLabel = tab ? ` — ${tab.charAt(0).toUpperCase() + tab.slice(1)}` : '';
          const title = `${clientMeta.name}${tabLabel}`;
          return {
            title: `${title} - Client Incentives - Berry OS`,
            description: clientMeta.description,
            openGraph: {
              title: `${title} - Client Incentives`,
              description: clientMeta.description,
              images: [clientMeta.ogImageUrl],
              type: "website",
            },
            twitter: {
              card: "summary_large_image",
              title: `${title} - Client Incentives`,
              description: clientMeta.description,
              images: [clientMeta.ogImageUrl],
            },
          };
        }
      }
    }

    // Dashboard / fallback
    const ogImageUrl = `${baseUrl}/api/og/clients`;
    return {
      title: "Client Incentives - Berry OS",
      description: "Nouns DAO client incentives dashboard — live on-chain rewards, leaderboards, and analytics.",
      openGraph: {
        title: "Client Incentives",
        description: "Nouns DAO client incentives dashboard — live on-chain rewards, leaderboards, and analytics.",
        images: [ogImageUrl],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Client Incentives",
        description: "Nouns DAO client incentives dashboard — live on-chain rewards, leaderboards, and analytics.",
        images: [ogImageUrl],
      },
    };
  }

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

  // Probe app metadata
  if (appId === 'probe') {
    // Probe detail: /probe/1806
    if (routeParams && routeParams.length > 0) {
      const nounId = parseInt(routeParams[0]);
      if (!isNaN(nounId) && nounId >= 0) {
        const ogImageUrl = `${baseUrl}/api/og/probe/${nounId}`;

        // Fetch trait info from DB for rich description
        let description = `Probe the colors and stats for Noun ${nounId}.`;
        try {
          const sql = ponderSql();
          const rows = await sql`
            SELECT head, glasses, accessory, body, background
            FROM ponder_live.nouns WHERE id = ${nounId}
          `;
          if (rows.length > 0) {
            const n = rows[0];
            const traits = [
              getTraitName('head', n.head),
              getTraitName('glasses', n.glasses),
              getTraitName('accessory', n.accessory),
              getTraitName('body', n.body),
              getTraitName('background', n.background),
            ];
            description = `Noun ${nounId} — ${traits.join(', ')}`;
          }
        } catch {
          // Fall back to generic description
        }

        const title = `Noun ${nounId}`;

        return {
          title: `${title} - Probe - Berry OS`,
          description,
          openGraph: {
            title,
            description,
            images: [ogImageUrl],
            type: 'website',
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
          },
        };
      }
    }

    // Probe grid (no specific noun)
    const ogImageUrl = `${baseUrl}/api/og/probe`;
    return {
      title: 'Probe - Berry OS',
      description: 'Explore all Nouns — filter by traits, colors, owners, and more.',
      openGraph: {
        title: 'Probe — Nouns Explorer',
        description: 'Explore all Nouns — filter by traits, colors, owners, and more.',
        images: [ogImageUrl],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Probe — Nouns Explorer',
        description: 'Explore all Nouns — filter by traits, colors, owners, and more.',
        images: [ogImageUrl],
      },
    };
  }

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
        const title = candidate.title || candidate.slug.replace(/-/g, ' ');
        const rawDescription = candidate.description || '';
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
        const title = candidate.title || candidate.slug.replace(/-/g, ' ');
        const rawDescription = candidate.description || '';
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
