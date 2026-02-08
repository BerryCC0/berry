/**
 * Client Avatar Component
 * Shows favicon, NFT image, or colored initials fallback.
 */

import type { ClientMetadataMap, ClientData } from '../types';
import { getClientImage, getInitials } from '../utils';
import { CHART_COLORS } from '../constants';
import styles from '../Clients.module.css';

interface ClientAvatarProps {
  clientId: number;
  name: string;
  clientMetadata?: ClientMetadataMap;
  clients?: ClientData[];
  size?: number;
}

export function ClientAvatar({ clientId, name, clientMetadata, clients, size }: ClientAvatarProps) {
  const imgSrc = getClientImage(clientId, clientMetadata, clients);
  const sizeStyle = size ? { width: size, height: size } : undefined;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        className={styles.clientAvatar}
        style={{ objectFit: 'cover', ...sizeStyle }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className={styles.clientAvatar}
      style={{ background: CHART_COLORS[clientId % CHART_COLORS.length], ...sizeStyle }}
    >
      {getInitials(name)}
    </div>
  );
}
