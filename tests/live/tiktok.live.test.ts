import { describe, expect, it } from "vitest";
import { advertiserService } from "@/tiktok/services/advertiser";

const enabled = process.env.TIKTOK_LIVE_TEST === "true";

describe.skipIf(!enabled)("TikTok live tests", () => {
  it("reads the configured advertiser", async () => {
    const advertiser = await advertiserService.getAdvertiser();
    expect(advertiser.advertiser_id).toBeTruthy();
    expect(advertiser.currency).toBeTruthy();
  });
});
