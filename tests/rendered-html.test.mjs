import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the completed tracker", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Market Map — FanDuel vs\. Kalshi<\/title>/i);
  assert.match(html, /What’s live where/);
  assert.match(html, /U\.S\. MARKET ACCESS/);
  assert.match(html, /FanDuel only/);
  assert.match(html, /Kalshi only/);
  assert.match(html, /Availability, not legal advice/);
  assert.match(html, /Red abbreviation \+ dotted border/);
  assert.match(html, /state-label is-contested/);
  assert.match(html, /challenge-state-code/);
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /aria-label="Map size"/);
  assert.match(html, />1\.5×</);
  assert.doesNotMatch(html, /Jump to a state/);
  assert.doesNotMatch(html, /<section class="hero"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
