import { describe, expect, it } from "vitest";
import { STEAM_OPENID, steamLoginUrl, verifySteamCallback } from "./steam";

const RETURN = "https://radstrat.app/api/auth/steam/callback?state=abc";
const ID = "76561198000000001";

function answer(overrides: Record<string, string> = {}) {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.op_endpoint": STEAM_OPENID,
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${ID}`,
    "openid.identity": `https://steamcommunity.com/openid/id/${ID}`,
    "openid.return_to": RETURN,
    "openid.response_nonce": "2026-11-20T10:00:00Zabc",
    "openid.assoc_handle": "1234567890",
    "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "sig=",
    ...overrides,
  });
  return new URL(`${RETURN}&${p.toString()}`);
}
const steamSays = (text: string) => async () => new Response(text);

describe("Steam sign-in", () => {
  it("sends the player to Steam with our callback", () => {
    const u = new URL(steamLoginUrl("https://radstrat.app", RETURN));
    expect(u.origin + u.pathname).toBe(STEAM_OPENID);
    expect(u.searchParams.get("openid.return_to")).toBe(RETURN);
    expect(u.searchParams.get("openid.realm")).toBe("https://radstrat.app");
  });

  it("accepts a signed answer that Steam confirms, and only gets the SteamID", async () => {
    let sent = "";
    const r = await verifySteamCallback(answer(), RETURN, async (_url, init) => {
      sent = String(init.body);
      return new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
    });
    expect(r).toEqual({ ok: true, steamId: ID, nonce: "2026-11-20T10:00:00Zabc" });
    expect(sent).toContain("openid.mode=check_authentication");
  });

  it("refuses answers Steam does not confirm", async () => {
    expect((await verifySteamCallback(answer(), RETURN, steamSays("is_valid:false\n"))).ok).toBe(false);
  });

  it("refuses answers meant for another site, from another server, or for a fake ID", async () => {
    const yes = steamSays("is_valid:true\n");
    expect((await verifySteamCallback(answer({ "openid.return_to": "https://evil.example/cb" }), RETURN, yes)).ok).toBe(false);
    expect((await verifySteamCallback(answer({ "openid.op_endpoint": "https://evil.example/openid" }), RETURN, yes)).ok).toBe(false);
    const fake = "https://evil.example/openid/id/76561198000000001";
    expect((await verifySteamCallback(answer({ "openid.claimed_id": fake, "openid.identity": fake }), RETURN, yes)).ok).toBe(false);
    expect((await verifySteamCallback(answer({ "openid.signed": "signed,op_endpoint" }), RETURN, yes)).ok).toBe(false);
  });
});
