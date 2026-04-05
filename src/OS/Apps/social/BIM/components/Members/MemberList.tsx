/**
 * MemberList — Right sidebar member list
 */

"use client";

import { useEffect } from "react";
import { useServers } from "../../hooks/useServers";
import { useBimStore } from "../../store/bimStore";
import type { BimMemberData } from "../../types";
import {
  addressToColor,
  getInitials,
  getMemberDisplayName,
} from "../../utils";
import styles from "../../BIM.module.css";

interface MemberListProps {
  serverId: string;
}

export function MemberList({ serverId }: MemberListProps) {
  const { members } = useBimStore();
  const { fetchMembers } = useServers();
  const serverMembers = members[serverId] ?? [];

  useEffect(() => {
    fetchMembers(serverId);
  }, [serverId, fetchMembers]);

  const owners = serverMembers.filter((m) => m.role === "owner");
  const admins = serverMembers.filter((m) => m.role === "admin");
  const membersList = serverMembers.filter((m) => m.role === "member");

  const renderMember = (member: BimMemberData) => {
    const name = getMemberDisplayName(
      member.wallet_address,
      member.nickname,
      member.display_name
    );
    const color = addressToColor(member.wallet_address);

    return (
      <div key={member.wallet_address} className={styles.memberItem}>
        <div className={styles.memberAvatar} style={{ background: color }}>
          {getInitials(member.display_name ?? member.nickname ?? null, member.wallet_address)}
        </div>
        <span className={styles.memberName}>{name}</span>
        {member.role === "owner" && (
          <span className={`${styles.memberRoleBadge} ${styles.memberRoleOwner}`}>
            Owner
          </span>
        )}
        {member.role === "admin" && (
          <span className={`${styles.memberRoleBadge} ${styles.memberRoleAdmin}`}>
            Admin
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.memberList}>
      {owners.length > 0 && (
        <>
          <div className={styles.memberCategory}>
            Owner — {owners.length}
          </div>
          {owners.map(renderMember)}
        </>
      )}
      {admins.length > 0 && (
        <>
          <div className={styles.memberCategory}>
            Admins — {admins.length}
          </div>
          {admins.map(renderMember)}
        </>
      )}
      {membersList.length > 0 && (
        <>
          <div className={styles.memberCategory}>
            Members — {membersList.length}
          </div>
          {membersList.map(renderMember)}
        </>
      )}
      {serverMembers.length === 0 && (
        <div className={styles.searchEmpty}>No members loaded</div>
      )}
    </div>
  );
}
