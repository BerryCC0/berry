/**
 * OpenSea Listing API Route
 *
 * Given an NFT contract + tokenId, finds an active OpenSea listing and
 * returns ready-to-submit transaction data (Seaport address, ETH value,
 * encoded calldata) plus metadata about the listing (seller, expiration,
 * image, name).
 *
 * Used by the `opensea-listing` proposal-action template so a proposer
 * can paste an OpenSea URL and have the editor build the calldata
 * automatically — no Seaport SDK knowledge required.
 *
 * Requires OPENSEA_API_KEY env var. Returns 503 when missing so the
 * generic Seaport template (which doesn't depend on the API) keeps
 * working.
 */

import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, isAddress, type Address } from 'viem';
// Import from the specific contracts module so the API route doesn't pull
// the client-only hooks (`useBid`, etc.) that the `@/app/lib/nouns` barrel
// re-exports — Next.js refuses to build server routes that touch React.
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// Minimal Seaport ABI — fulfill functions we re-encode for proposals.
// Seaport address (1.5/1.6 on mainnet) is 0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC.
const SEAPORT_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'considerationToken', type: 'address' },
          { name: 'considerationIdentifier', type: 'uint256' },
          { name: 'considerationAmount', type: 'uint256' },
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          { name: 'offerToken', type: 'address' },
          { name: 'offerIdentifier', type: 'uint256' },
          { name: 'offerAmount', type: 'uint256' },
          { name: 'basicOrderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'offererConduitKey', type: 'bytes32' },
          { name: 'fulfillerConduitKey', type: 'bytes32' },
          { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
          {
            components: [
              { name: 'amount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
            ],
            name: 'additionalRecipients',
            type: 'tuple[]',
          },
          { name: 'signature', type: 'bytes' },
        ],
        name: 'parameters',
        type: 'tuple',
      },
    ],
    name: 'fulfillBasicOrder',
    outputs: [{ name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  // fulfillAdvancedOrder — covers any single-order fulfillment OpenSea
  // routes through. Used for partial-fill orders, criteria-based offers,
  // and post-Seaport-1.5 listings that don't fit the basic mold.
  {
    inputs: [
      {
        name: 'advancedOrder',
        type: 'tuple',
        components: [
          {
            name: 'parameters',
            type: 'tuple',
            components: [
              { name: 'offerer', type: 'address' },
              { name: 'zone', type: 'address' },
              {
                name: 'offer',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                ],
              },
              {
                name: 'consideration',
                type: 'tuple[]',
                components: [
                  { name: 'itemType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'identifierOrCriteria', type: 'uint256' },
                  { name: 'startAmount', type: 'uint256' },
                  { name: 'endAmount', type: 'uint256' },
                  { name: 'recipient', type: 'address' },
                ],
              },
              { name: 'orderType', type: 'uint8' },
              { name: 'startTime', type: 'uint256' },
              { name: 'endTime', type: 'uint256' },
              { name: 'zoneHash', type: 'bytes32' },
              { name: 'salt', type: 'uint256' },
              { name: 'conduitKey', type: 'bytes32' },
              { name: 'totalOriginalConsiderationItems', type: 'uint256' },
            ],
          },
          { name: 'numerator', type: 'uint120' },
          { name: 'denominator', type: 'uint120' },
          { name: 'signature', type: 'bytes' },
          { name: 'extraData', type: 'bytes' },
        ],
      },
      {
        name: 'criteriaResolvers',
        type: 'tuple[]',
        components: [
          { name: 'orderIndex', type: 'uint256' },
          { name: 'side', type: 'uint8' },
          { name: 'index', type: 'uint256' },
          { name: 'identifier', type: 'uint256' },
          { name: 'criteriaProof', type: 'bytes32[]' },
        ],
      },
      { name: 'fulfillerConduitKey', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
    ],
    name: 'fulfillAdvancedOrder',
    outputs: [{ name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const TREASURY_ADDRESS = NOUNS_ADDRESSES.treasury as Address;
const SEAPORT_ADDRESS = '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC' as Address;

/** Shape of the response we send back to the editor. */
interface ListingResponse {
  to: string;
  value: string; // wei, decimal string
  calldata: string; // 0x...
  listing: {
    orderHash: string;
    seller: string;
    priceWei: string;
    priceEth: string;
    expirationTimestamp: number;
    paymentToken: string; // 0x000…0 = ETH
    collectionSlug?: string;
    imageUrl?: string;
    name?: string;
    isReserveListing: boolean;
  };
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function openseaFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${OPENSEA_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-API-KEY': OPENSEA_API_KEY!,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
}

/**
 * GET /api/opensea/listing?contract=0x...&tokenId=123
 *
 * Looks up the cheapest active ETH listing on OpenSea and returns the
 * full transaction data needed to fulfill it from the treasury.
 */
export async function GET(request: NextRequest) {
  if (!OPENSEA_API_KEY) {
    return NextResponse.json(
      {
        error:
          'OPENSEA_API_KEY env var is not configured. The opensea-listing template needs this; the generic marketplace-fulfill-seaport template works without it.',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');

  if (!contract || !isAddress(contract)) {
    return badRequest('Missing or invalid `contract` parameter (must be a 0x address).');
  }
  if (!tokenId || !/^\d+$/.test(tokenId)) {
    return badRequest('Missing or invalid `tokenId` parameter (must be a non-negative integer).');
  }

  try {
    // -------- Step 1: look up the NFT to get its collection slug -------
    // The current v2 listings endpoints are scoped to a collection slug,
    // so we need that before we can ask for listings.
    const nftRes = await openseaFetch(
      `/chain/ethereum/contract/${contract}/nfts/${tokenId}`,
    );
    if (!nftRes.ok) {
      const text = await nftRes.text();
      return NextResponse.json(
        {
          error: `OpenSea NFT lookup failed: ${nftRes.status}`,
          detail: text.slice(0, 400),
        },
        { status: 502 },
      );
    }
    const nftJson = (await nftRes.json()) as {
      nft?: {
        collection?: string;
        display_image_url?: string;
        image_url?: string;
        name?: string;
      };
    };
    const collectionSlug = nftJson.nft?.collection;
    if (!collectionSlug) {
      return NextResponse.json(
        { error: 'OpenSea NFT lookup returned no collection slug.' },
        { status: 502 },
      );
    }

    // -------- Step 2: find an active listing for this NFT --------------
    // We try multiple OpenSea endpoints because each has gaps:
    //   1. `/orders/ethereum/seaport/listings` — filters by contract +
    //      tokenId directly, covers ANY payment token and ANY taker. Most
    //      reliable when it works, but the path has been flaky on us.
    //   2. `/listings/collection/{slug}/nfts/{tokenId}/best` — cheapest
    //      ETH-only listing. Fast but misses WETH listings + reserve
    //      listings + recently-posted listings not yet in its cache.
    //   3. `/listings/collection/{slug}/all` paginated — full catalogue
    //      for the collection, filtered client-side. Expensive for large
    //      collections (Nouns has 1900+ items), but always works.
    //
    // We try them in order, falling through on empty / 404, only failing
    // hard if every endpoint errors. Errors are aggregated so debugging
    // the response is easy.
    type Listing = {
      order_hash: string;
      protocol_address: string;
      price?: { current?: { value?: string; currency?: string } };
      maker?: { address: string };
      taker?: { address: string } | null;
      protocol_data?: {
        parameters?: {
          endTime?: string;
          offerer?: string;
          offer?: Array<{
            identifierOrCriteria?: string;
            token?: string;
          }>;
        };
      };
    };
    const errorsTried: string[] = [];
    let listing: Listing | null = null;

    // --- Attempt 1: direct orders filter -----------------------------
    const ordersUrl =
      `/orders/ethereum/seaport/listings` +
      `?asset_contract_address=${contract}` +
      `&token_ids=${tokenId}` +
      `&order_by=eth_price&order_direction=asc&limit=20`;
    const ordersRes = await openseaFetch(ordersUrl);
    if (ordersRes.ok) {
      const ordersJson = (await ordersRes.json()) as {
        orders?: Listing[];
      };
      const now = Math.floor(Date.now() / 1000);
      listing =
        (ordersJson.orders || []).find((o) => {
          const endTime = Number(o.protocol_data?.parameters?.endTime || '0');
          return o.order_hash && endTime > now;
        }) || null;
    } else {
      errorsTried.push(`orders endpoint: ${ordersRes.status}`);
    }

    // --- Attempt 2: /best (cheapest ETH listing) ---------------------
    if (!listing) {
      const bestRes = await openseaFetch(
        `/listings/collection/${collectionSlug}/nfts/${tokenId}/best`,
      );
      if (bestRes.ok) {
        const bestJson = (await bestRes.json()) as Listing | Record<string, never>;
        if ('order_hash' in bestJson && bestJson.order_hash) {
          listing = bestJson as Listing;
        }
      } else if (bestRes.status !== 404) {
        errorsTried.push(`best endpoint: ${bestRes.status}`);
      }
    }

    // --- Attempt 3: /all paginated, filtered client-side --------------
    // Walks up to 5 pages (250 listings) looking for the asked-for token.
    // Stops early once found.
    if (!listing) {
      const now = Math.floor(Date.now() / 1000);
      let cursor: string | undefined = undefined;
      for (let page = 0; page < 5; page++) {
        const url = new URL(
          `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all`,
        );
        url.searchParams.set('limit', '50');
        if (cursor) url.searchParams.set('next', cursor);
        const allRes = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'X-API-KEY': OPENSEA_API_KEY,
          },
        });
        if (!allRes.ok) {
          errorsTried.push(`all endpoint page ${page}: ${allRes.status}`);
          break;
        }
        const allJson = (await allRes.json()) as {
          listings?: Listing[];
          next?: string;
        };
        const match =
          (allJson.listings || []).find((l) => {
            const offer = l.protocol_data?.parameters?.offer?.[0];
            const offerToken = (offer?.token || '').toLowerCase();
            const offerId = offer?.identifierOrCriteria;
            const endTime = Number(l.protocol_data?.parameters?.endTime || '0');
            return (
              offerToken === contract.toLowerCase() &&
              offerId === tokenId &&
              endTime > now
            );
          }) || null;
        if (match) {
          listing = match;
          break;
        }
        if (!allJson.next) break;
        cursor = allJson.next;
      }
    }

    if (!listing) {
      return NextResponse.json(
        {
          error: 'No active OpenSea listing found for this NFT.',
          detail:
            errorsTried.length > 0
              ? `Tried: ${errorsTried.join('; ')}`
              : `Checked orders / best / all (5 pages) for collection "${collectionSlug}" — no match.`,
        },
        { status: 404 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const expirationTimestamp = listing.protocol_data?.parameters?.endTime
      ? Number(listing.protocol_data.parameters.endTime)
      : 0;

    if (expirationTimestamp && expirationTimestamp <= now) {
      return NextResponse.json(
        { error: 'OpenSea listing is expired.' },
        { status: 404 },
      );
    }

    const candidate = {
      order_hash: listing.order_hash,
      protocol_address: listing.protocol_address,
      expiration_time: expirationTimestamp,
      maker: listing.maker || { address: '' },
      taker: listing.taker || null,
      current_price: listing.price?.current?.value || '0',
    };

    // -------- Step 2: fetch fulfillment data ---------------------------
    // POST to OpenSea's fulfillment_data endpoint, passing the treasury
    // as the fulfiller. The response includes the function name + the
    // parameters object we need to encode into calldata.
    const fulfillRes = await openseaFetch('/listings/fulfillment_data', {
      method: 'POST',
      body: JSON.stringify({
        listing: {
          hash: candidate.order_hash,
          chain: 'ethereum',
          protocol_address: candidate.protocol_address,
        },
        fulfiller: { address: TREASURY_ADDRESS },
      }),
    });
    if (!fulfillRes.ok) {
      const text = await fulfillRes.text();
      return NextResponse.json(
        {
          error: `OpenSea fulfillment_data failed: ${fulfillRes.status}`,
          detail: text.slice(0, 400),
        },
        { status: 502 },
      );
    }
    const fulfillJson = (await fulfillRes.json()) as {
      protocol: string;
      fulfillment_data: {
        transaction: {
          function: string;
          chain: number;
          to: string;
          value: number | string;
          input_data: {
            parameters: Record<string, unknown>;
          };
        };
      };
    };

    const tx = fulfillJson.fulfillment_data.transaction;

    // -------- Step 3: encode the calldata ------------------------------
    // OpenSea returns the parameters object; we encode it via viem +
    // the BasicOrderParameters tuple. We always call `fulfillBasicOrder`
    // since the optimised `_efficient_6GL6yc` variant only differs in
    // function selector (gas-only optimisation that's irrelevant to a
    // DAO proposal that doesn't have a gas budget).
    // OpenSea's `function` value comes back with the full ABI signature
    // appended (e.g. `fulfillBasicOrder_efficient_6GL6yc(...)` or
    // `fulfillAdvancedOrder(...)`), so we prefix-match to decide which
    // encoder to use. Both basic variants share the BasicOrderParameters
    // layout; fulfillAdvancedOrder has its own AdvancedOrder tuple.
    let calldata: string;
    try {
      if (tx.function.startsWith('fulfillBasicOrder')) {
        calldata = encodeFunctionData({
          abi: SEAPORT_ABI,
          functionName: 'fulfillBasicOrder',
          args: [normalizeBasicOrderParameters(tx.input_data.parameters)],
        });
      } else if (tx.function.startsWith('fulfillAdvancedOrder')) {
        const args = normalizeAdvancedOrderArgs(tx.input_data);
        calldata = encodeFunctionData({
          abi: SEAPORT_ABI,
          functionName: 'fulfillAdvancedOrder',
          args: [args.advancedOrder, args.criteriaResolvers, args.fulfillerConduitKey, args.recipient],
        });
      } else {
        return NextResponse.json(
          {
            error:
              `OpenSea returned an unsupported fulfillment (${tx.function.split('(')[0]}). ` +
              `Use the generic Seaport template with calldata generated by the ` +
              `Seaport SDK.`,
          },
          { status: 501 },
        );
      }
    } catch (e) {
      return NextResponse.json(
        {
          error: 'Failed to encode Seaport calldata from OpenSea response.',
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 500 },
      );
    }

    // -------- Step 4: metadata (already fetched in step 1) -------------
    const imageUrl = nftJson.nft?.display_image_url || nftJson.nft?.image_url;
    const name = nftJson.nft?.name;

    // Detect "reserve listing" — when the order has a taker explicitly
    // set to the treasury, sniping is impossible. Useful info for the
    // editor's preview.
    const isReserveListing =
      !!candidate.taker?.address &&
      candidate.taker.address.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

    const valueWei = String(tx.value);
    const priceWei = candidate.current_price;
    const priceEth = (Number(BigInt(priceWei)) / 1e18).toFixed(6);

    const response: ListingResponse = {
      to: tx.to,
      value: valueWei,
      calldata,
      listing: {
        orderHash: candidate.order_hash,
        seller: candidate.maker.address,
        priceWei,
        priceEth,
        expirationTimestamp: candidate.expiration_time,
        paymentToken: '0x0000000000000000000000000000000000000000',
        collectionSlug,
        imageUrl,
        name,
        isReserveListing,
      },
    };

    return NextResponse.json(response, {
      headers: {
        // Short cache — listings change fast, but back-to-back hits from
        // the editor should hit the cache.
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Unexpected error talking to OpenSea',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

/**
 * Convert OpenSea's `input_data` for fulfillAdvancedOrder into the
 * argument shapes viem's encoder expects. OpenSea returns string-typed
 * uint256s and untyped JSON; we cast to bigint/Address as needed.
 */
function normalizeAdvancedOrderArgs(input: Record<string, unknown>) {
  // OpenSea has used a couple of shapes here historically — sometimes
  // the wrapper key is `advancedOrder`, sometimes `parameters` is
  // hoisted to the top level. Support both.
  const ao =
    (input.advancedOrder as Record<string, unknown> | undefined) ||
    (input.parameters
      ? {
          parameters: input.parameters,
          numerator: input.numerator,
          denominator: input.denominator,
          signature: input.signature,
          extraData: input.extraData,
        }
      : undefined);

  if (!ao || !ao.parameters) {
    throw new Error(
      'OpenSea fulfillAdvancedOrder response is missing advancedOrder.parameters',
    );
  }

  const params = ao.parameters as Record<string, unknown>;

  const offer = (params.offer as Array<Record<string, unknown>>).map((o) => ({
    itemType: Number(o.itemType),
    token: o.token as Address,
    identifierOrCriteria: BigInt(o.identifierOrCriteria as string),
    startAmount: BigInt(o.startAmount as string),
    endAmount: BigInt(o.endAmount as string),
  }));

  const consideration = (
    params.consideration as Array<Record<string, unknown>>
  ).map((c) => ({
    itemType: Number(c.itemType),
    token: c.token as Address,
    identifierOrCriteria: BigInt(c.identifierOrCriteria as string),
    startAmount: BigInt(c.startAmount as string),
    endAmount: BigInt(c.endAmount as string),
    recipient: c.recipient as Address,
  }));

  const advancedOrder = {
    parameters: {
      offerer: params.offerer as Address,
      zone: params.zone as Address,
      offer,
      consideration,
      orderType: Number(params.orderType),
      startTime: BigInt(params.startTime as string),
      endTime: BigInt(params.endTime as string),
      zoneHash: params.zoneHash as `0x${string}`,
      salt: BigInt(params.salt as string),
      conduitKey: params.conduitKey as `0x${string}`,
      totalOriginalConsiderationItems: BigInt(
        params.totalOriginalConsiderationItems as string,
      ),
    },
    numerator: BigInt((ao.numerator as string) || '1'),
    denominator: BigInt((ao.denominator as string) || '1'),
    signature: (ao.signature as `0x${string}`) || '0x',
    extraData: (ao.extraData as `0x${string}`) || '0x',
  };

  const criteriaResolvers = (
    (input.criteriaResolvers as Array<Record<string, unknown>> | undefined) || []
  ).map((r) => ({
    orderIndex: BigInt(r.orderIndex as string),
    side: Number(r.side),
    index: BigInt(r.index as string),
    identifier: BigInt(r.identifier as string),
    criteriaProof: ((r.criteriaProof as string[]) || []) as readonly `0x${string}`[],
  }));

  const fulfillerConduitKey =
    (input.fulfillerConduitKey as `0x${string}`) ||
    ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);
  const recipient = (input.recipient as Address) || TREASURY_ADDRESS;

  return { advancedOrder, criteriaResolvers, fulfillerConduitKey, recipient };
}

/**
 * Convert OpenSea's `input_data.parameters` object (string-typed numbers,
 * mixed casings) into the shape viem's encoder expects: bigints for
 * uint256, hex strings for bytes32, plain strings for address, etc.
 */
function normalizeBasicOrderParameters(raw: Record<string, unknown>) {
  const get = (k: string) => raw[k];
  return {
    considerationToken: get('considerationToken') as Address,
    considerationIdentifier: BigInt(get('considerationIdentifier') as string),
    considerationAmount: BigInt(get('considerationAmount') as string),
    offerer: get('offerer') as Address,
    zone: get('zone') as Address,
    offerToken: get('offerToken') as Address,
    offerIdentifier: BigInt(get('offerIdentifier') as string),
    offerAmount: BigInt(get('offerAmount') as string),
    basicOrderType: Number(get('basicOrderType')),
    startTime: BigInt(get('startTime') as string),
    endTime: BigInt(get('endTime') as string),
    zoneHash: get('zoneHash') as `0x${string}`,
    salt: BigInt(get('salt') as string),
    offererConduitKey: get('offererConduitKey') as `0x${string}`,
    fulfillerConduitKey: get('fulfillerConduitKey') as `0x${string}`,
    totalOriginalAdditionalRecipients: BigInt(
      get('totalOriginalAdditionalRecipients') as string,
    ),
    additionalRecipients: (
      (get('additionalRecipients') as Array<{ amount: string; recipient: string }>) || []
    ).map((r) => ({
      amount: BigInt(r.amount),
      recipient: r.recipient as Address,
    })),
    signature: get('signature') as `0x${string}`,
  };
}
