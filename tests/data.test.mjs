import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dataUrl = new URL("../data/statuses.json", import.meta.url);
const newsUrl = new URL("../data/news.json", import.meta.url);

test("tracks every state and the District of Columbia", async () => {
  const data = JSON.parse(await readFile(dataUrl, "utf8"));
  assert.equal(data.states.length, 51);
  assert.equal(new Set(data.states.map((state) => state.name)).size, 51);
  assert.equal(new Set(data.states.map((state) => state.fips)).size, 51);
  assert.ok(data.states.some((state) => state.name === "District of Columbia"));
  assert.ok(data.states.every((state) => typeof state.fanduel === "boolean"));
  assert.ok(data.states.every((state) => typeof state.kalshi === "boolean"));
  assert.match(data.generatedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("each of the four requested comparison categories has data", async () => {
  const data = JSON.parse(await readFile(dataUrl, "utf8"));
  const categories = new Set(
    data.states.map((state) => `${state.fanduel}-${state.kalshi}`),
  );
  assert.deepEqual(
    [...categories].sort(),
    ["false-false", "false-true", "true-false", "true-true"],
  );
});

test("news monitor contains current state challenge headlines", async () => {
  const data = JSON.parse(await readFile(newsUrl, "utf8"));
  assert.match(data.generatedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data.source, "Google News");
  assert.ok(data.items.length >= 4);
  assert.ok(data.items.length <= 6);
  assert.ok(
    data.items.every(
      (item) =>
        item.title.includes("Kalshi") &&
        item.url.startsWith("https://") &&
        item.source.length > 0 &&
        !Number.isNaN(Date.parse(item.publishedAt)) &&
        item.states.length > 0,
    ),
  );
});
