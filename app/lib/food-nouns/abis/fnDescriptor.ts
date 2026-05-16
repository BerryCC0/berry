/**
 * Food Nouns Descriptor (V1 fork) — minimal indexer ABI.
 * Address (current at deploy): 0x79Db17727aD213e360DE893D9075Ae5f75D4f89C
 *
 * Used at index time to render the noun's SVG from its seed.
 * The handler reads the descriptor address from the token contract
 * at the noun's mint block, so descriptor upgrades are handled
 * transparently.
 */
export const fnDescriptorAbi = [
  {
    inputs: [
      {
        components: [
          { name: "background", type: "uint48" },
          { name: "body", type: "uint48" },
          { name: "accessory", type: "uint48" },
          { name: "head", type: "uint48" },
          { name: "glasses", type: "uint48" },
        ],
        name: "seed",
        type: "tuple",
      },
    ],
    name: "generateSVGImage",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
