/**
 * XMTP Client Setup
 * Bridges wagmi wallet to XMTP Browser SDK
 */

import { Client, type Signer } from "@xmtp/browser-sdk";
import { IdentifierKind } from "@xmtp/wasm-bindings";

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
  const client = await Client.create(signer, {
    env: opts?.env ?? (process.env.NODE_ENV === "production" ? "production" : "dev"),
  });

  return client;
}
