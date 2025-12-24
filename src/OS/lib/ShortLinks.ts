/**
 * ShortLinks Service
 * Create and resolve short, shareable URLs for Berry OS states
 */

import { nanoid } from "nanoid";

interface ShortLinkOptions {
  expiresIn?: number; // Milliseconds until expiration
  metadata?: Record<string, unknown>; // Additional data to store
}

interface ShortLink {
  id: string;
  fullPath: string;
  createdAt: number;
  expiresAt?: number;
  clickCount: number;
  metadata?: Record<string, unknown>;
}

interface CreateShortLinkPayload {
  id: string;
  fullPath: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

class ShortLinksService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "https://berryos.app";
  }

  /**
   * Create a short link
   */
  async create(fullPath: string, options?: ShortLinkOptions): Promise<string> {
    const id = nanoid(8); // 8 character ID

    const expiresAt = options?.expiresIn
      ? Date.now() + options.expiresIn
      : undefined;

    const payload: CreateShortLinkPayload = {
      id,
      fullPath,
      expiresAt,
      metadata: options?.metadata,
    };

    try {
      const response = await fetch("/api/shortlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create short link");
      }

      // Return full short URL
      return `${this.baseUrl}/s/${id}`;
    } catch (error) {
      console.error("[ShortLinks] Failed to create:", error);
      
      // Fallback: return the full path if short link creation fails
      return fullPath;
    }
  }

  /**
   * Resolve a short link to full path
   */
  async resolve(id: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/shortlinks?id=${encodeURIComponent(id)}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.fullPath || null;
    } catch (error) {
      console.error("[ShortLinks] Failed to resolve:", error);
      return null;
    }
  }

  /**
   * Get user's short links (requires auth)
   */
  async getMyLinks(): Promise<ShortLink[]> {
    try {
      const response = await fetch("/api/shortlinks/mine");

      if (!response.ok) {
        return [];
      }

      return response.json();
    } catch (error) {
      console.error("[ShortLinks] Failed to get links:", error);
      return [];
    }
  }

  /**
   * Delete a short link
   */
  async delete(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/shortlinks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      return response.ok;
    } catch (error) {
      console.error("[ShortLinks] Failed to delete:", error);
      return false;
    }
  }

  /**
   * Generate a shareable URL for current app state
   */
  buildSharePath(appId: string, state?: Record<string, unknown>): string {
    if (!state || Object.keys(state).length === 0) {
      return `/app/${appId}`;
    }

    switch (appId) {
      case "finder":
        if (state.path && state.path !== "/") {
          return `/app/finder${state.path}`;
        }
        return "/app/finder";

      case "media-viewer":
        if (state.filePath) {
          return `/app/media-viewer${state.filePath}`;
        }
        return "/app/media-viewer";

      case "text-editor":
        if (state.filePath) {
          return `/app/text-editor?file=${encodeURIComponent(state.filePath as string)}`;
        }
        return "/app/text-editor";

      case "settings":
        if (state.panel) {
          return `/app/settings/${state.panel}`;
        }
        return "/app/settings";

      default:
        // Generic: encode state as query params
        const params = new URLSearchParams();
        Object.entries(state).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.set(key, String(value));
          }
        });
        const queryString = params.toString();
        return queryString ? `/app/${appId}?${queryString}` : `/app/${appId}`;
    }
  }
}

export const shortLinks = new ShortLinksService();

