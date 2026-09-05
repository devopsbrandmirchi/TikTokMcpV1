import { afterEach, describe, expect, it, vi } from "vitest";
import { advertiserService } from "@/tiktok/services/advertiser";
import { campaignService } from "@/tiktok/services/campaign";
import { adGroupService } from "@/tiktok/services/ad-group";
import { adService } from "@/tiktok/services/ad";
import { reportService } from "@/tiktok/services/report";
import { MemoryTikTokTokenStore } from "@/tiktok/store/memory";
import { resetTikTokTokenStore, setTikTokTokenStore } from "@/tiktok/store";
import {
  adGroupListFixture,
  adListFixture,
  advertiserInfoFixture,
  campaignListFixture,
  campaignReportFixture,
} from "../fixtures/tiktok";
import { setRequiredEnv } from "../env";

setRequiredEnv();

afterEach(() => {
  vi.unstubAllGlobals();
  resetTikTokTokenStore();
});

function installStore() {
  const store = new MemoryTikTokTokenStore();
  void store.write({
    accessToken: "access",
    advertiserIds: ["1234567890123456789"],
    updatedAt: Date.now(),
    accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
  });
  setTikTokTokenStore(store);
}

function mockFetchByPath(handlers: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const entry = Object.entries(handlers).find(([path]) => url.includes(path));
      if (!entry) {
        return new Response(JSON.stringify({ code: 1, message: `unexpected ${url}` }), { status: 500 });
      }
      return new Response(JSON.stringify(entry[1]), { status: 200 });
    }),
  );
}

describe("TikTok services", () => {
  it("normalizes advertiser, campaigns, ad groups, and ads", async () => {
    installStore();
    mockFetchByPath({
      "/advertiser/info/": advertiserInfoFixture,
      "/campaign/get/": campaignListFixture,
      "/adgroup/get/": adGroupListFixture,
      "/ad/get/": adListFixture,
    });

    const advertiser = await advertiserService.getAdvertiser();
    expect(advertiser.advertiser_name).toBe("Example Advertiser");
    expect(advertiser.currency).toBe("USD");

    const campaigns = await campaignService.listCampaigns({ page: 1, pageSize: 20 });
    expect(campaigns.items[0]?.campaign_name).toBe("Summer RV Campaign");
    expect(campaigns.pagination.has_more).toBe(false);

    const campaign = await campaignService.getCampaign("111");
    expect(campaign.campaign_id).toBe("111");

    const groups = await adGroupService.listAdGroups({ campaignId: "111" });
    expect(groups.items[0]?.adgroup_id).toBe("222");

    const ads = await adService.listAds({ campaignId: "111" });
    expect(ads.items[0]?.landing_page_url).toBe("https://example.com");
    expect(campaigns.api_source).toBe("classic");
  });

  it("falls back to Smart+ campaign, ad group, and ad list endpoints on 40002", async () => {
    installStore();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/campaign/get/") && !url.includes("/smart_plus/")) {
          return new Response(JSON.stringify({ code: 40002, message: "No permission" }), { status: 200 });
        }
        if (url.includes("/smart_plus/campaign/get/")) {
          return new Response(JSON.stringify(campaignListFixture), { status: 200 });
        }
        if (url.includes("/adgroup/get/") && !url.includes("/smart_plus/")) {
          return new Response(JSON.stringify({ code: 40002, message: "No permission" }), { status: 200 });
        }
        if (url.includes("/smart_plus/adgroup/get/")) {
          return new Response(JSON.stringify(adGroupListFixture), { status: 200 });
        }
        if (url.includes("/ad/get/") && !url.includes("/smart_plus/")) {
          return new Response(JSON.stringify({ code: 40002, message: "No permission" }), { status: 200 });
        }
        if (url.includes("/smart_plus/ad/get/")) {
          return new Response(JSON.stringify(adListFixture), { status: 200 });
        }
        return new Response(JSON.stringify({ code: 1, message: url }), { status: 500 });
      }),
    );

    const campaigns = await campaignService.listCampaigns();
    expect(campaigns.api_source).toBe("smart_plus");
    expect(campaigns.items[0]?.campaign_name).toBe("Summer RV Campaign");

    const groups = await adGroupService.listAdGroups();
    expect(groups.api_source).toBe("smart_plus");
    expect(groups.items[0]?.adgroup_id).toBe("222");

    const ads = await adService.listAds();
    expect(ads.api_source).toBe("smart_plus");
    expect(ads.items[0]?.ad_id).toBeDefined();
  });

  it("runs a synchronous campaign report with currency and data notes", async () => {
    installStore();
    mockFetchByPath({
      "/advertiser/info/": advertiserInfoFixture,
      "/report/integrated/get/": campaignReportFixture,
    });

    const report = await reportService.run({
      dimension: "campaign",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(report.currency).toBe("USD");
    expect(report.mode).toBe("synchronous");
    expect(report.partial).toBe(false);
    expect(report.rows[0]?.spend).toBe(2038.2);
    expect(report.rows[0]?.conversions).toBe(42);
    expect(report.data_notes.length).toBeGreaterThan(0);
  });

  it("falls back to async reporting when the sync report is too large", async () => {
    installStore();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/advertiser/info/")) {
          return new Response(JSON.stringify(advertiserInfoFixture), { status: 200 });
        }
        if (url.includes("/report/integrated/get/")) {
          return new Response(JSON.stringify({ code: 40000, message: "exceeds 10000 advertisements" }), {
            status: 200,
          });
        }
        if (url.includes("/report/task/create/")) {
          return new Response(JSON.stringify({ code: 0, data: { task_id: "task-1" } }), { status: 200 });
        }
        if (url.includes("/report/task/check/")) {
          return new Response(JSON.stringify({ code: 0, data: { status: "SUCCESS" } }), { status: 200 });
        }
        if (url.includes("/report/task/download/")) {
          return new Response(JSON.stringify(campaignReportFixture), { status: 200 });
        }
        return new Response(JSON.stringify({ code: 1, message: url }), { status: 500 });
      }),
    );

    const report = await reportService.run({
      dimension: "campaign",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(report.mode).toBe("asynchronous");
    expect(report.rows).toHaveLength(1);
  });
});
