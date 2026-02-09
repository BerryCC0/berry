/**
 * useNotifications — Push notification subscription management
 *
 * Note: Full push notification delivery requires a persistent Node.js process
 * running the XMTP Node SDK to listen for messages and forward them via
 * Web Push. This hook handles the client-side subscription management.
 * Server-side delivery should be handled by a separate service (e.g., a
 * long-running worker or a dedicated push notification server).
 */

"use client";

import { useState, useCallback } from "react";
import { useAppKitAccount } from "@reown/appkit/react";

export function useNotifications() {
  const { address } = useAppKitAccount();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState(
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
  );

  const subscribe = useCallback(async () => {
    if (!address || !isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys) return false;

      // Send subscription to our API
      const res = await fetch("/api/bim/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          endpoint: json.endpoint,
          p256dh_key: json.keys.p256dh,
          auth_key: json.keys.auth,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        return true;
      }
    } catch (err) {
      console.error("[BIM] Failed to subscribe to push:", err);
    }
    return false;
  }, [address, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!address) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        await fetch("/api/bim/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: address,
            endpoint: subscription.endpoint,
          }),
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("[BIM] Failed to unsubscribe from push:", err);
    }
  }, [address]);

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}
