/**
 * Dynamic OG Image for Client Incentives Dashboard
 * Shows a leaderboard-style card with top rewarded clients and key stats.
 */

import { ImageResponse } from 'next/og';
import { ponderSql } from '@/app/lib/ponder-db';
import { CLIENT_NAMES } from '@/OS/lib/clientNames';

export const runtime = 'nodejs';

function weiToEth(wei: string): number {
  return Number(BigInt(wei || '0')) / 1e18;
}

function fmtEth(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

const BAR_COLORS = [
  '#5B8DEF', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#5ac8fa', '#ffcc00', '#ff2d55', '#64d2ff', '#30d158',
];

export async function GET() {
  try {
    const sql = ponderSql();

    // Fetch top clients + global stats in parallel
    const [clientRows, globalStats] = await Promise.all([
      sql`
        SELECT c.client_id, c.name,
               c.total_rewarded::text as total_rewarded,
               c.total_withdrawn::text as total_withdrawn
        FROM ponder_live.clients c
        WHERE c.approved = true
        ORDER BY c.total_rewarded DESC NULLS LAST
        LIMIT 7
      `,
      sql`
        SELECT
          COUNT(*)::int as total_clients,
          COALESCE(SUM(total_rewarded), 0)::text as total_distributed
        FROM ponder_live.clients
      `,
    ]);

    const totalClients = globalStats[0]?.total_clients ?? 0;
    const totalDistributed = weiToEth(globalStats[0]?.total_distributed ?? '0');

    const clients = clientRows.map((c: any) => ({
      id: c.client_id,
      name: CLIENT_NAMES[c.client_id] ?? (c.name || `Client ${c.client_id}`),
      rewarded: weiToEth(c.total_rewarded),
    }));

    const maxReward = Math.max(...clients.map((c: any) => c.rewarded), 0.001);

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            fontFamily: 'system-ui',
            padding: '48px 56px',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-1px',
                }}
              >
                Client Incentives
              </span>
            </div>
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 600,
              }}
            >
              Berry OS
            </span>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 40,
              marginBottom: 36,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#5B8DEF' }}>
                {fmtEth(totalDistributed)} ETH
              </span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
                distributed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#34c759' }}>
                {totalClients}
              </span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
                registered clients
              </span>
            </div>
          </div>

          {/* Leaderboard bars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              flex: 1,
            }}
          >
            {clients.map((client: any, i: number) => {
              const barWidth = Math.max((client.rewarded / maxReward) * 100, 4);
              const color = BAR_COLORS[i % BAR_COLORS.length];

              return (
                <div
                  key={client.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {/* Rank */}
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: i < 3 ? '#ffd700' : 'rgba(255,255,255,0.4)',
                      width: 28,
                      textAlign: 'right',
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Name */}
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#ffffff',
                      width: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {client.name}
                  </span>

                  {/* Bar */}
                  <div
                    style={{
                      display: 'flex',
                      flex: 1,
                      height: 28,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: `${barWidth}%`,
                        height: '100%',
                        background: color,
                        borderRadius: 6,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 10,
                      }}
                    >
                      {barWidth > 15 && (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'rgba(0,0,0,0.6)',
                          }}
                        >
                          {fmtEth(client.rewarded)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value (shown outside bar if bar is small) */}
                  {barWidth <= 15 && (
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.6)',
                        width: 80,
                      }}
                    >
                      {fmtEth(client.rewarded)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer tagline */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 16,
            }}
          >
            <span
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.3)',
                fontWeight: 500,
              }}
            >
              Nouns DAO Client Incentives — live on-chain data
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('[OG] Failed to generate Clients image:', error);

    // Fallback
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>
            Client Incentives
          </span>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            Nouns DAO — Berry OS
          </span>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
