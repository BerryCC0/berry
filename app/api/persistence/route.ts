/**
 * Persistence API Route
 * Handles all persistence operations via POST requests.
 * The NeonAdapter runs server-side, this route exposes it to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { NeonAdapter } from "@/OS/lib/Persistence/NeonAdapter";
import type {
  DockConfig,
  DesktopLayout,
  PersistedWindowState,
} from "@/OS/lib/Persistence/types";
import type { Theme } from "@/OS/types/theme";
import type { SystemSettings } from "@/OS/types/settings";

// Initialize adapter once
let adapter: NeonAdapter | null = null;

function getAdapter(): NeonAdapter {
  if (!adapter) {
    adapter = new NeonAdapter();
  }
  return adapter;
}

// Action types for the API
type PersistenceAction =
  | { type: "getProfileByWallet"; address: string; chain: string }
  | { type: "createProfile"; wallet: { address: string; chain: string; chainId: number } }
  | { type: "linkWallet"; profileId: string; wallet: { address: string; chain: string; chainId: number; label?: string } }
  | { type: "unlinkWallet"; profileId: string; address: string; chain: string }
  | { type: "updateLastActive"; profileId: string }
  | { type: "saveTheme"; profileId: string; theme: Theme }
  | { type: "loadTheme"; profileId: string }
  | { type: "saveSettings"; profileId: string; settings: SystemSettings }
  | { type: "loadSettings"; profileId: string }
  | { type: "saveDesktopLayout"; profileId: string; layout: DesktopLayout }
  | { type: "loadDesktopLayout"; profileId: string }
  | { type: "saveWindowState"; profileId: string; windows: PersistedWindowState[] }
  | { type: "loadWindowState"; profileId: string }
  | { type: "saveDockConfig"; profileId: string; config: DockConfig }
  | { type: "loadDockConfig"; profileId: string }
  | { type: "saveAppState"; profileId: string; appId: string; state: unknown }
  | { type: "loadAppState"; profileId: string; appId: string }
  | { type: "loadAllUserData"; profileId: string }
  | { type: "clearAllUserData"; profileId: string };

export async function POST(request: NextRequest) {
  try {
    const action = (await request.json()) as PersistenceAction;
    const db = getAdapter();

    switch (action.type) {
      case "getProfileByWallet": {
        const profile = await db.getProfileByWallet(action.address, action.chain);
        return NextResponse.json({ data: profile });
      }

      case "createProfile": {
        const profile = await db.createProfile(action.wallet);
        return NextResponse.json({ data: profile });
      }

      case "linkWallet": {
        await db.linkWallet(action.profileId, action.wallet);
        return NextResponse.json({ success: true });
      }

      case "unlinkWallet": {
        await db.unlinkWallet(action.profileId, action.address, action.chain);
        return NextResponse.json({ success: true });
      }

      case "updateLastActive": {
        await db.updateLastActive(action.profileId);
        return NextResponse.json({ success: true });
      }

      case "saveTheme": {
        await db.saveTheme(action.profileId, action.theme);
        return NextResponse.json({ success: true });
      }

      case "loadTheme": {
        const theme = await db.loadTheme(action.profileId);
        return NextResponse.json({ data: theme });
      }

      case "saveSettings": {
        await db.saveSettings(action.profileId, action.settings);
        return NextResponse.json({ success: true });
      }

      case "loadSettings": {
        const settings = await db.loadSettings(action.profileId);
        return NextResponse.json({ data: settings });
      }

      case "saveDesktopLayout": {
        await db.saveDesktopLayout(action.profileId, action.layout);
        return NextResponse.json({ success: true });
      }

      case "loadDesktopLayout": {
        const layout = await db.loadDesktopLayout(action.profileId);
        return NextResponse.json({ data: layout });
      }

      case "saveWindowState": {
        await db.saveWindowState(action.profileId, action.windows);
        return NextResponse.json({ success: true });
      }

      case "loadWindowState": {
        const windows = await db.loadWindowState(action.profileId);
        return NextResponse.json({ data: windows });
      }

      case "saveDockConfig": {
        await db.saveDockConfig(action.profileId, action.config);
        return NextResponse.json({ success: true });
      }

      case "loadDockConfig": {
        const config = await db.loadDockConfig(action.profileId);
        return NextResponse.json({ data: config });
      }

      case "saveAppState": {
        await db.saveAppState(action.profileId, action.appId, action.state);
        return NextResponse.json({ success: true });
      }

      case "loadAppState": {
        const state = await db.loadAppState(action.profileId, action.appId);
        return NextResponse.json({ data: state });
      }

      case "loadAllUserData": {
        const data = await db.loadAllUserData(action.profileId);
        return NextResponse.json({ data });
      }

      case "clearAllUserData": {
        await db.clearAllUserData(action.profileId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Persistence API] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

