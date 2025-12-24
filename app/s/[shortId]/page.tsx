"use client";

/**
 * Short Link Route Handler
 * Resolves short links to their full paths
 * 
 * Example:
 *   /s/x7Kg2mPq → resolves to /app/finder/Documents
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { shortLinks } from "@/OS/lib/ShortLinks";
import styles from "./page.module.css";

export default function ShortLinkRoute() {
  const params = useParams();
  const router = useRouter();
  const shortId = params.shortId as string;
  const [status, setStatus] = useState<"resolving" | "not-found">("resolving");

  useEffect(() => {
    const resolve = async () => {
      try {
        const fullPath = await shortLinks.resolve(shortId);

        if (fullPath) {
          router.push(fullPath);
        } else {
          console.error(`[ShortLink] Not found: ${shortId}`);
          setStatus("not-found");
          
          // Redirect to desktop after a brief delay
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
      } catch (error) {
        console.error(`[ShortLink] Error resolving: ${shortId}`, error);
        setStatus("not-found");
        
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    };

    resolve();
  }, [shortId, router]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {status === "resolving" && (
          <>
            <div className={styles.spinner} />
            <p className={styles.message}>Redirecting...</p>
          </>
        )}
        
        {status === "not-found" && (
          <>
            <div className={styles.icon}>🔗</div>
            <p className={styles.message}>Link not found or expired</p>
            <p className={styles.submessage}>Redirecting to desktop...</p>
          </>
        )}
      </div>
    </div>
  );
}

