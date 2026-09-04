export const advertiserInfoFixture = {
  code: 0,
  message: "OK",
  request_id: "req-advertiser-1",
  data: {
    list: [
      {
        advertiser_id: "1234567890123456789",
        name: "Example Advertiser",
        status: "STATUS_ENABLE",
        currency: "USD",
        timezone: "America/New_York",
        display_timezone: "America/New_York",
        country: "US",
        company: "Example Co",
        create_time: "2024-01-15 10:00:00",
      },
    ],
  },
};

export const campaignListFixture = {
  code: 0,
  message: "OK",
  request_id: "req-campaign-1",
  data: {
    list: [
      {
        campaign_id: "111",
        campaign_name: "Summer RV Campaign",
        status: "ENABLE",
        operation_status: "ENABLE",
        objective_type: "TRAFFIC",
        budget: 100,
        budget_mode: "BUDGET_MODE_DAY",
        create_time: "2026-07-01 12:00:00",
        modify_time: "2026-08-01 12:00:00",
      },
    ],
    page_info: { page: 1, page_size: 20, total_number: 1, total_page: 1 },
  },
};

export const adGroupListFixture = {
  code: 0,
  message: "OK",
  request_id: "req-adgroup-1",
  data: {
    list: [
      {
        adgroup_id: "222",
        adgroup_name: "Lookalike 1%",
        campaign_id: "111",
        status: "ENABLE",
        budget: 50,
        budget_mode: "BUDGET_MODE_DAY",
        bid_price: 1.2,
        optimization_goal: "CLICK",
        placement_type: "PLACEMENT_TYPE_AUTOMATIC",
      },
    ],
    page_info: { page: 1, page_size: 20, total_number: 1, total_page: 1 },
  },
};

export const adListFixture = {
  code: 0,
  message: "OK",
  request_id: "req-ad-1",
  data: {
    list: [
      {
        ad_id: "333",
        ad_name: "Video A",
        adgroup_id: "222",
        campaign_id: "111",
        status: "ENABLE",
        landing_page_url: "https://example.com",
        ad_format: "SINGLE_VIDEO",
      },
    ],
    page_info: { page: 1, page_size: 20, total_number: 1, total_page: 1 },
  },
};

export const campaignReportFixture = {
  code: 0,
  message: "OK",
  request_id: "req-report-1",
  data: {
    list: [
      {
        dimensions: { campaign_id: "111" },
        metrics: {
          campaign_name: "Summer RV Campaign",
          impressions: "150000",
          clicks: "4300",
          spend: "2038.20",
          conversion: "42",
          ctr: "2.8667",
          cpc: "0.4739",
          cpm: "13.588",
        },
      },
    ],
    page_info: { page: 1, page_size: 100, total_number: 1, total_page: 1 },
  },
};

export const tokenExchangeFixture = {
  code: 0,
  message: "OK",
  data: {
    access_token: "tiktok-access-token",
    refresh_token: "tiktok-refresh-token",
    advertiser_ids: ["1234567890123456789"],
    expires_in: 86400,
  },
};
