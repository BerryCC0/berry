/**
 * Custom Recharts XAxis Tick
 * Renders a favicon/NFT image alongside the client name.
 * Angles text when many items to prevent collision.
 */

import type { ClientMetadataMap, ClientData } from '../types';
import { getClientImage } from '../utils';

const MAX_NAME_LENGTH = 10;

function truncate(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  return name.slice(0, MAX_NAME_LENGTH - 1) + '…';
}

interface ClientTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  clientMetadata?: ClientMetadataMap;
  chartData?: Array<{ clientId: number; name: string }>;
  clients?: ClientData[];
  /** Total number of ticks — passed automatically by Recharts */
  visibleTicksCount?: number;
}

export function ClientTick({ x, y, payload, clientMetadata, chartData, clients, visibleTicksCount }: ClientTickProps) {
  const name = payload?.value ?? '';
  const entry = chartData?.find((d) => d.name === name);
  const imgSrc = getClientImage(entry?.clientId, clientMetadata, clients);
  const count = visibleTicksCount ?? chartData?.length ?? 0;
  const shouldAngle = count > 4;
  const label = truncate(name);

  if (shouldAngle) {
    return (
      <g transform={`translate(${x},${y})`}>
        {imgSrc && (
          <image
            href={imgSrc}
            x={-7}
            y={2}
            width={14}
            height={14}
            clipPath="inset(0% round 2px)"
          />
        )}
        <text
          x={imgSrc ? 2 : 0}
          y={imgSrc ? 22 : 6}
          textAnchor="end"
          fontSize={9}
          fill="var(--berry-text-secondary, #6e6e73)"
          transform={`rotate(-35, ${imgSrc ? 2 : 0}, ${imgSrc ? 22 : 6})`}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {imgSrc && (
        <image
          href={imgSrc}
          x={-7}
          y={2}
          width={14}
          height={14}
            clipPath="inset(0% round 2px)"
          />
        )}
        <text
          x={0}
          y={imgSrc ? 22 : 6}
        textAnchor="middle"
        fontSize={9}
        fill="var(--berry-text-secondary, #6e6e73)"
      >
        {label}
      </text>
    </g>
  );
}
