/**
 * XMTP Client Setup
 * Bridges wagmi wallet to XMTP Browser SDK
 */

import { Client, IdentifierKind, LogLevel, type Signer } from "@xmtp/browser-sdk";

/**
 * Create an XMTP-compatible signer from a wagmi wallet client
 */
export function createXmtpSigner(walletClient: {
  account: { address: string };
  signMessage: (args: { message: string }) => Promise<string>;
}): Signer {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: walletClient.account.address,
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const sig = await walletClient.signMessage({ message });
      // Convert hex string to Uint8Array
      const hex = sig.startsWith("0x") ? sig.slice(2) : sig;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes;
    },
  };
}

/**
 * Create and initialize an XMTP client
 */
export async function createXmtpClient(
  signer: Signer,
  opts?: { env?: "dev" | "production" | "local" }
): Promise<Client> {
  const env = opts?.env ?? (process.env.NODE_ENV === "production" ? "production" : "dev");
  console.log("[BIM] Creating XMTP client, env:", env);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(
      `XMTP client creation timed out after 30s (env: ${env}). ` +
      "The WASM worker may have failed to load."
    )), 30_000)
  );

  const client = await Promise.race([
    Client.create(signer, {
      env,
      appVersion: "berry-bim/1.0",
      loggingLevel: LogLevel.Debug,
    }),
    timeout,
  ]);

  console.log("[BIM] XMTP client created, inbox:", client.inboxId);
  return client;
}
