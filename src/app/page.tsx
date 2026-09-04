import { APP_NAME, APP_VERSION } from "@/config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", maxWidth: "42rem", margin: "3rem auto", padding: "0 1.25rem", lineHeight: 1.5 }}>
      <h1>{APP_NAME}</h1>
      <p>Production Claude.ai Custom Connector for one TikTok advertiser account.</p>
      <p>Connect Claude.ai to <code>/mcp</code>. Health check: <code>/health</code>.</p>
      <p style={{ color: "#666" }}>Version {APP_VERSION}. This is not a campaign dashboard.</p>
    </main>
  );
}
