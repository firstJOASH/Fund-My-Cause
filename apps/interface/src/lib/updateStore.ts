/**
 * UpdateStore — client-side storage for campaign updates.
 *
 * Updates are stored as JSON objects on IPFS via Pinata and referenced by
 * a local index in localStorage. The localStorage key per campaign is:
 *   fmc:updates:<campaignId>
 *
 * The value is a JSON-serialised string[] of IPFS CIDs, most-recent first.
 */

import { uploadToPinata } from "@/lib/pinata";

// ── Pinata gateway URL ──────────────────────────────────────────────────────

const PINATA_GATEWAY_URL =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ??
  "https://gateway.pinata.cloud/ipfs";

/** Converts an ipfs:// URI to an HTTP gateway URL */
function toGatewayUrl(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY_URL}/${uri.slice(7)}`;
  }
  return uri;
}

// ── Update type ─────────────────────────────────────────────────────────────

export interface Update {
  campaignId: string;
  title: string;
  body: string;
  imageUri?: string;
  authorAddress: string;
  createdAt: number; // Unix ms timestamp
  editedAt?: number; // Unix ms timestamp, present after edit
}

// ── localStorage helpers ─────────────────────────────────────────────────────

function storageKey(campaignId: string): string {
  return `fmc:updates:${campaignId}`;
}

/**
 * Returns the ordered list of IPFS CIDs for a campaign's updates (most-recent first).
 * Returns an empty array when the entry is missing or corrupted.
 */
export function getCids(campaignId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function saveCids(campaignId: string, cids: string[]): void {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify(cids));
  } catch {
    // localStorage unavailable — silently no-op
  }
}

// ── IPFS helpers ─────────────────────────────────────────────────────────────

/**
 * Serialises an Update to JSON, uploads it to IPFS via Pinata,
 * and returns the resulting CID (ipfs://... URI).
 */
async function uploadUpdate(update: Update): Promise<string> {
  const json = JSON.stringify(update);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], `update-${update.campaignId}-${update.createdAt}.json`, {
    type: "application/json",
  });
  return uploadToPinata(file);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new campaign update, uploads it to IPFS, prepends the CID to
 * the campaign's update list in localStorage, and optionally fires a
 * notification via the provided addNotification callback.
 *
 * @returns The IPFS CID of the new update
 */
export async function createUpdate(
  update: Omit<Update, "createdAt">,
  addNotification?: (params: {
    type: "campaign_update";
    title: string;
    message: string;
    campaignId: string;
  }) => void,
): Promise<string> {
  const fullUpdate: Update = {
    ...update,
    createdAt: Date.now(),
  };

  const uri = await uploadUpdate(fullUpdate);
  const cid = uri; // ipfs://... URI

  // Prepend — most-recent first
  const existing = getCids(update.campaignId);
  saveCids(update.campaignId, [cid, ...existing]);

  // Fire notification
  addNotification?.({
    type: "campaign_update",
    title: "New Campaign Update",
    message: update.title,
    campaignId: update.campaignId,
  });

  return cid;
}

/**
 * Fetches and deserialises an Update from IPFS given its CID URI.
 *
 * @throws Error if the fetch or parse fails
 */
export async function fetchUpdate(cid: string): Promise<Update> {
  const url = toGatewayUrl(cid);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch update: ${res.statusText}`);
  const data = await res.json();
  return data as Update;
}

/**
 * Edits an existing update: fetches the old one, merges the patch,
 * sets editedAt, uploads a new JSON object, and replaces the old CID
 * in localStorage.
 *
 * @returns The new IPFS CID
 */
export async function editUpdate(
  campaignId: string,
  oldCid: string,
  patch: Partial<Pick<Update, "title" | "body" | "imageUri">>,
): Promise<string> {
  const existing = await fetchUpdate(oldCid);

  const updated: Update = {
    ...existing,
    ...patch,
    editedAt: Date.now(),
  };

  const newUri = await uploadUpdate(updated);

  // Replace old CID with new CID in the ordered list
  const cids = getCids(campaignId);
  const idx = cids.indexOf(oldCid);
  if (idx !== -1) {
    cids[idx] = newUri;
    saveCids(campaignId, cids);
  }

  return newUri;
}

/**
 * Removes a CID from the campaign's update list in localStorage.
 * Silently no-ops on missing or corrupted entries.
 */
export function deleteUpdate(campaignId: string, cid: string): void {
  const cids = getCids(campaignId);
  const filtered = cids.filter((c) => c !== cid);
  saveCids(campaignId, filtered);
}
