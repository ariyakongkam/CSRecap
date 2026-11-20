/**
 * "Sign in through Steam" (OpenID 2.0). Steam only tells us the player's SteamID64: no email, no name.
 * https://partner.steamgames.com/doc/features/auth
 */

export const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/;

/** Where to send the player to sign in. `returnTo` must be our own callback URL. */
export function steamLoginUrl(origin: string, returnTo: string): string {
  const p = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID}?${p.toString()}`;
}

export type SteamCheck = { ok: true; steamId: string; nonce: string } | { ok: false; reason: string };

/**
 * Checks Steam's answer on our callback: it must be meant for our callback URL, come from Steam's
 * endpoint, name a real SteamID, and Steam itself must confirm the signature (check_authentication).
 */
export async function verifySteamCallback(
  callbackUrl: URL,
  expectedReturnTo: string,
  fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch,
): Promise<SteamCheck> {
  const q = callbackUrl.searchParams;
  if (q.get("openid.mode") !== "id_res") return { ok: false, reason: "not a sign-in answer" };
  if (q.get("openid.ns") !== NS) return { ok: false, reason: "wrong protocol" };
  if (q.get("openid.op_endpoint") !== STEAM_OPENID) return { ok: false, reason: "not from Steam" };
  const returnTo = q.get("openid.return_to") ?? "";
  if (returnTo !== expectedReturnTo) return { ok: false, reason: "meant for another page" };
  const claimed = q.get("openid.claimed_id") ?? "";
  const match = CLAIMED_ID.exec(claimed);
  if (!match || q.get("openid.identity") !== claimed) return { ok: false, reason: "no SteamID" };
  const nonce = q.get("openid.response_nonce") ?? "";
  if (!nonce) return { ok: false, reason: "no nonce" };
  // Every signed field must be present; Steam checks the signature over exactly these.
  const signed = (q.get("openid.signed") ?? "").split(",").filter(Boolean);
  for (const f of ["op_endpoint", "claimed_id", "identity", "return_to", "response_nonce", "assoc_handle"]) {
    if (!signed.includes(f)) return { ok: false, reason: `unsigned ${f}` };
  }

  const body = new URLSearchParams();
  for (const [k, v] of q) if (k.startsWith("openid.")) body.set(k, v);
  body.set("openid.mode", "check_authentication");
  const res = await fetcher(STEAM_OPENID, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return { ok: false, reason: "Steam did not answer" };
  const text = await res.text();
  if (!/^is_valid\s*:\s*true\s*$/m.test(text)) return { ok: false, reason: "Steam said no" };
  return { ok: true, steamId: match[1], nonce };
}
