import { describe, expect, it } from "vitest";
import { parsePlayerQuery } from "./query";

describe("parsePlayerQuery", () => {
  it("accepts nicknames", () => {
    expect(parsePlayerQuery("  my_nick-1 ")).toEqual({ kind: "nickname", value: "my_nick-1" });
  });
  it("accepts SteamID64 and steam profile links", () => {
    expect(parsePlayerQuery("76561198386265483")).toEqual({ kind: "steam64", value: "76561198386265483" });
    expect(parsePlayerQuery("https://steamcommunity.com/profiles/76561198386265483/")).toEqual({
      kind: "steam64",
      value: "76561198386265483",
    });
  });
  it("accepts FACEIT profile links", () => {
    expect(parsePlayerQuery("https://www.faceit.com/en/players/someone")).toEqual({ kind: "nickname", value: "someone" });
  });
  it("rejects custom steam links and bad input with a helpful reason", () => {
    expect(parsePlayerQuery("steamcommunity.com/id/foo").kind).toBe("invalid");
    expect(parsePlayerQuery("12345").kind).toBe("invalid");
    expect(parsePlayerQuery("bad name!").kind).toBe("invalid");
    expect(parsePlayerQuery("").kind).toBe("invalid");
  });
});
