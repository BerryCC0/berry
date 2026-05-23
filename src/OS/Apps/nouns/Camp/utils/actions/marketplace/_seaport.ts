/**
 * Seaport (OpenSea) shared types + tuple encoding primitives.
 *
 * The OpenSea protocol exposes a `Seaport` contract with a handful of
 * stateful entry points relevant to a DAO proposal:
 *
 *   • `validate(Order[] orders)`    — authorize an order on-chain. The DAO
 *                                     is the offerer; once validated, anyone
 *                                     can fulfill without a signature. This
 *                                     is the contract-bidder pattern — same
 *                                     idea as `setPreSignature` on CoW.
 *   • `cancel(OrderComponents[])`   — explicitly cancel specific orders.
 *   • `incrementCounter()`          — bulk-cancel ALL of the caller's orders.
 *   • `fulfillAdvancedOrder(...)`   — accept a standing offer (sell INTO it).
 *
 * Seaport's order shape is well-defined and documented at
 * https://docs.opensea.io/reference/seaport-overview. The tuple is nested
 * (offer/consideration items are arrays of structs) but viem handles it
 * cleanly through `encodeAbiParameters` / `decodeAbiParameters` with the
 * appropriate parameter strings.
 *
 * IMPORTANT — `OrderParameters` vs `OrderComponents`:
 *   • `OrderParameters` has `totalOriginalConsiderationItems` at the end.
 *     This is what `validate()` and `fulfill*()` consume.
 *   • `OrderComponents` has `counter` at the end. This is what `cancel()`
 *     consumes and what `getOrderHash()` operates on.
 *
 * The two structs are otherwise identical. We define both signatures
 * below; mixing them is a common source of bugs.
 */

import {
  type Address,
  type Hex,
  decodeAbiParameters,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';

// ---------------------------------------------------------------------------
// Addresses + constants
// ---------------------------------------------------------------------------

/**
 * Seaport 1.6 — current OpenSea deployment as of writing.
 * Seaport 1.5 (0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC) is the legacy
 * deployment that some open listings still live on. For new orders the DAO
 * proposes here, we always target 1.6.
 */
export const SEAPORT_1_6 =
  '0x0000000000000068F116a894984e2DB1123eB395' as Address;

/**
 * OpenSea's default conduit key. The conduit is the contract that holds
 * pull-approvals to the actual marketplace; using OpenSea's standard conduit
 * lets orders appear in their UI consistently.
 */
export const OPENSEA_CONDUIT_KEY =
  '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000' as Hex;

/**
 * OpenSea's conduit contract address. WETH/ERC-721 approvals for orders that
 * use the default conduit key go to THIS address, not directly to Seaport.
 */
export const OPENSEA_CONDUIT =
  '0x1E0049783F008A0085193E00003D00cd54003c71' as Address;

/** OpenSea's protocol fee recipient (current configuration). */
export const OPENSEA_FEE_RECIPIENT =
  '0x0000a26b00c1F0DF003000390027140000fAa719' as Address;

/** OpenSea's standard protocol fee: 50 BPS (0.5%) of the trade value. */
export const OPENSEA_FEE_BPS = 50;

// ---------------------------------------------------------------------------
// Seaport struct shapes — TypeScript types
// ---------------------------------------------------------------------------

/**
 * Seaport item types, identifying what kind of asset an offer/consideration
 * line represents. Numbers match the on-chain enum.
 */
export enum ItemType {
  NATIVE = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
  /** ERC-721 where any tokenId matching a merkle proof against `criteria` works. */
  ERC721_WITH_CRITERIA = 4,
  /** ERC-1155 with criteria. */
  ERC1155_WITH_CRITERIA = 5,
}

/**
 * Order type. Restricted/contract orders use zones; partial orders allow
 * settling a fraction of the requested amount.
 */
export enum OrderType {
  FULL_OPEN = 0,
  PARTIAL_OPEN = 1,
  FULL_RESTRICTED = 2,
  PARTIAL_RESTRICTED = 3,
}

export interface OfferItem {
  itemType: ItemType;
  token: Address;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
}

export interface ConsiderationItem extends OfferItem {
  recipient: Address;
}

export interface OrderParameters {
  offerer: Address;
  zone: Address;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  orderType: OrderType;
  startTime: bigint;
  endTime: bigint;
  zoneHash: Hex;
  salt: bigint;
  conduitKey: Hex;
  /** Number of items in `consideration` that came from the offerer (vs. fees
   *  added by the marketplace). Matters for validate() / fulfill*(). */
  totalOriginalConsiderationItems: bigint;
}

/**
 * Same fields as OrderParameters but with `counter` instead of
 * `totalOriginalConsiderationItems`. Used by cancel() and order-hash
 * computation.
 */
export interface OrderComponents extends Omit<OrderParameters, 'totalOriginalConsiderationItems'> {
  counter: bigint;
}

/** What `validate()` and `fulfill*()` consume — params + signature. */
export interface Order {
  parameters: OrderParameters;
  signature: Hex;
}

// ---------------------------------------------------------------------------
// ABI parameter strings
// ---------------------------------------------------------------------------

/**
 * Tuple shapes — anonymous (no field names). viem's parseAbiParameters
 * handles named structs but is flaky with deeply-nested forms, so we use
 * position-based tuples here. Field meanings are documented in the
 * TypeScript interfaces above; encoders/decoders below convert between
 * the struct and tuple positions.
 */

const OFFER_ITEM_ABI = '(uint8,address,uint256,uint256,uint256)';
const CONSIDERATION_ITEM_ABI =
  '(uint8,address,uint256,uint256,uint256,address)';

export const ORDER_PARAMETERS_ABI =
  `(address,address,${OFFER_ITEM_ABI}[],${CONSIDERATION_ITEM_ABI}[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256)`;

export const ORDER_COMPONENTS_ABI =
  `(address,address,${OFFER_ITEM_ABI}[],${CONSIDERATION_ITEM_ABI}[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256)`;

export const ORDER_ABI = `(${ORDER_PARAMETERS_ABI},bytes)`;

export const ADVANCED_ORDER_ABI =
  `(${ORDER_PARAMETERS_ABI},uint120,uint120,bytes,bytes)`;

export const CRITERIA_RESOLVER_ABI =
  '(uint256,uint8,uint256,uint256,bytes32[])';

// ---------------------------------------------------------------------------
// JSON <-> struct helpers
// ---------------------------------------------------------------------------

/**
 * Editors store Order data as JSON strings (form fields are strings, and
 * Order contains bigints which JSON.stringify can't handle without help).
 * These two functions canonicalise the round-trip:
 *
 *   parseOrderJson(stringified) → in-memory Order with proper bigints
 *   stringifyOrder(order) → stringified form
 *
 * The wire format uses decimal strings for bigints; viem then converts to
 * actual bigints when encoding. This means a stringified Order from
 * `stringifyOrder` re-parses identically — important for round-trip tests.
 */
export function parseOrderJson(raw: string): Order {
  const parsed = JSON.parse(raw) as JsonOrder;
  return {
    parameters: parseOrderParametersJson(parsed.parameters),
    signature: parsed.signature as Hex,
  };
}

export function stringifyOrder(order: Order): string {
  const json: JsonOrder = {
    parameters: stringifyOrderParameters(order.parameters),
    signature: order.signature,
  };
  return JSON.stringify(json);
}

export function parseOrderComponentsJson(raw: string): OrderComponents {
  const parsed = JSON.parse(raw) as JsonOrderComponents;
  return {
    ...parseOrderParametersBaseJson(parsed),
    counter: BigInt(parsed.counter),
  };
}

export function stringifyOrderComponents(c: OrderComponents): string {
  const json: JsonOrderComponents = {
    ...stringifyOrderParametersBase(c),
    counter: c.counter.toString(),
  };
  return JSON.stringify(json);
}

// ---------------------------------------------------------------------------
// Tuple encoding
// ---------------------------------------------------------------------------

/**
 * Encode an Order as the calldata that `validate(Order[])` expects.
 * Returns the calldata body (without the function selector — the proposal
 * action's `signature` field provides that).
 */
export function encodeValidateCalldata(orders: Order[]): Hex {
  return encodeAbiParameters(parseAbiParameters(`${ORDER_ABI}[]`), [
    orders.map((o) => orderToTuple(o)) as never,
  ]);
}

/**
 * Decode calldata produced by `validate(Order[])` back into a list of Orders.
 * Returns null if the calldata doesn't match the expected shape.
 */
export function decodeValidateCalldata(calldata: Hex | string): Order[] | null {
  if (!calldata || calldata === '0x') return null;
  try {
    const normalised = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
    const [arr] = decodeAbiParameters(
      parseAbiParameters(`${ORDER_ABI}[]`),
      normalised,
    );
    return (arr as readonly RawOrderTuple[]).map(tupleToOrder);
  } catch {
    return null;
  }
}

/** Encode `cancel(OrderComponents[])` calldata. */
export function encodeCancelCalldata(components: OrderComponents[]): Hex {
  return encodeAbiParameters(parseAbiParameters(`${ORDER_COMPONENTS_ABI}[]`), [
    components.map((c) => orderComponentsToTuple(c)) as never,
  ]);
}

/** Decode `cancel(OrderComponents[])` calldata. */
export function decodeCancelCalldata(
  calldata: Hex | string,
): OrderComponents[] | null {
  if (!calldata || calldata === '0x') return null;
  try {
    const normalised = (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
    const [arr] = decodeAbiParameters(
      parseAbiParameters(`${ORDER_COMPONENTS_ABI}[]`),
      normalised,
    );
    return (arr as readonly RawOrderComponentsTuple[]).map(
      tupleToOrderComponents,
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal: JSON <-> struct (BigInt-safe)
// ---------------------------------------------------------------------------

interface JsonOfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}
interface JsonConsiderationItem extends JsonOfferItem {
  recipient: string;
}
interface JsonOrderParametersBase {
  offerer: string;
  zone: string;
  offer: JsonOfferItem[];
  consideration: JsonConsiderationItem[];
  orderType: number;
  startTime: string;
  endTime: string;
  zoneHash: string;
  salt: string;
  conduitKey: string;
}
interface JsonOrderParameters extends JsonOrderParametersBase {
  totalOriginalConsiderationItems: string;
}
interface JsonOrderComponents extends JsonOrderParametersBase {
  counter: string;
}
interface JsonOrder {
  parameters: JsonOrderParameters;
  signature: string;
}

function parseOrderParametersBaseJson(j: JsonOrderParametersBase): Omit<OrderParameters, 'totalOriginalConsiderationItems'> {
  return {
    offerer: j.offerer as Address,
    zone: j.zone as Address,
    offer: j.offer.map((o) => ({
      itemType: o.itemType as ItemType,
      token: o.token as Address,
      identifierOrCriteria: BigInt(o.identifierOrCriteria),
      startAmount: BigInt(o.startAmount),
      endAmount: BigInt(o.endAmount),
    })),
    consideration: j.consideration.map((c) => ({
      itemType: c.itemType as ItemType,
      token: c.token as Address,
      identifierOrCriteria: BigInt(c.identifierOrCriteria),
      startAmount: BigInt(c.startAmount),
      endAmount: BigInt(c.endAmount),
      recipient: c.recipient as Address,
    })),
    orderType: j.orderType as OrderType,
    startTime: BigInt(j.startTime),
    endTime: BigInt(j.endTime),
    zoneHash: j.zoneHash as Hex,
    salt: BigInt(j.salt),
    conduitKey: j.conduitKey as Hex,
  };
}

function parseOrderParametersJson(j: JsonOrderParameters): OrderParameters {
  return {
    ...parseOrderParametersBaseJson(j),
    totalOriginalConsiderationItems: BigInt(j.totalOriginalConsiderationItems),
  };
}

function stringifyOrderParametersBase(p: Omit<OrderParameters, 'totalOriginalConsiderationItems'>): JsonOrderParametersBase {
  return {
    offerer: p.offerer,
    zone: p.zone,
    offer: p.offer.map((o) => ({
      itemType: o.itemType,
      token: o.token,
      identifierOrCriteria: o.identifierOrCriteria.toString(),
      startAmount: o.startAmount.toString(),
      endAmount: o.endAmount.toString(),
    })),
    consideration: p.consideration.map((c) => ({
      itemType: c.itemType,
      token: c.token,
      identifierOrCriteria: c.identifierOrCriteria.toString(),
      startAmount: c.startAmount.toString(),
      endAmount: c.endAmount.toString(),
      recipient: c.recipient,
    })),
    orderType: p.orderType,
    startTime: p.startTime.toString(),
    endTime: p.endTime.toString(),
    zoneHash: p.zoneHash,
    salt: p.salt.toString(),
    conduitKey: p.conduitKey,
  };
}

function stringifyOrderParameters(p: OrderParameters): JsonOrderParameters {
  return {
    ...stringifyOrderParametersBase(p),
    totalOriginalConsiderationItems: p.totalOriginalConsiderationItems.toString(),
  };
}

// ---------------------------------------------------------------------------
// Internal: tuple <-> struct converters for viem
// ---------------------------------------------------------------------------

type RawOfferTuple = readonly [number, Address, bigint, bigint, bigint];
type RawConsiderationTuple = readonly [
  number,
  Address,
  bigint,
  bigint,
  bigint,
  Address,
];
type RawOrderParametersTuple = readonly [
  Address,
  Address,
  readonly RawOfferTuple[],
  readonly RawConsiderationTuple[],
  number,
  bigint,
  bigint,
  Hex,
  bigint,
  Hex,
  bigint,
];
type RawOrderTuple = readonly [RawOrderParametersTuple, Hex];
type RawOrderComponentsTuple = readonly [
  Address,
  Address,
  readonly RawOfferTuple[],
  readonly RawConsiderationTuple[],
  number,
  bigint,
  bigint,
  Hex,
  bigint,
  Hex,
  bigint,
];

function offerToTuple(o: OfferItem): RawOfferTuple {
  return [o.itemType, o.token, o.identifierOrCriteria, o.startAmount, o.endAmount];
}

function considerationToTuple(c: ConsiderationItem): RawConsiderationTuple {
  return [
    c.itemType,
    c.token,
    c.identifierOrCriteria,
    c.startAmount,
    c.endAmount,
    c.recipient,
  ];
}

function orderParametersToTuple(p: OrderParameters): RawOrderParametersTuple {
  return [
    p.offerer,
    p.zone,
    p.offer.map(offerToTuple),
    p.consideration.map(considerationToTuple),
    p.orderType,
    p.startTime,
    p.endTime,
    p.zoneHash,
    p.salt,
    p.conduitKey,
    p.totalOriginalConsiderationItems,
  ];
}

function orderToTuple(o: Order): RawOrderTuple {
  return [orderParametersToTuple(o.parameters), o.signature];
}

function orderComponentsToTuple(c: OrderComponents): RawOrderComponentsTuple {
  return [
    c.offerer,
    c.zone,
    c.offer.map(offerToTuple),
    c.consideration.map(considerationToTuple),
    c.orderType,
    c.startTime,
    c.endTime,
    c.zoneHash,
    c.salt,
    c.conduitKey,
    c.counter,
  ];
}

function tupleToOfferItem(t: RawOfferTuple): OfferItem {
  return {
    itemType: t[0] as ItemType,
    token: t[1],
    identifierOrCriteria: t[2],
    startAmount: t[3],
    endAmount: t[4],
  };
}

function tupleToConsiderationItem(t: RawConsiderationTuple): ConsiderationItem {
  return {
    itemType: t[0] as ItemType,
    token: t[1],
    identifierOrCriteria: t[2],
    startAmount: t[3],
    endAmount: t[4],
    recipient: t[5],
  };
}

function tupleToOrderParameters(t: RawOrderParametersTuple): OrderParameters {
  return {
    offerer: t[0],
    zone: t[1],
    offer: t[2].map(tupleToOfferItem),
    consideration: t[3].map(tupleToConsiderationItem),
    orderType: t[4] as OrderType,
    startTime: t[5],
    endTime: t[6],
    zoneHash: t[7],
    salt: t[8],
    conduitKey: t[9],
    totalOriginalConsiderationItems: t[10],
  };
}

function tupleToOrder(t: RawOrderTuple): Order {
  return { parameters: tupleToOrderParameters(t[0]), signature: t[1] };
}

function tupleToOrderComponents(t: RawOrderComponentsTuple): OrderComponents {
  return {
    offerer: t[0],
    zone: t[1],
    offer: t[2].map(tupleToOfferItem),
    consideration: t[3].map(tupleToConsiderationItem),
    orderType: t[4] as OrderType,
    startTime: t[5],
    endTime: t[6],
    zoneHash: t[7],
    salt: t[8],
    conduitKey: t[9],
    counter: t[10],
  };
}

