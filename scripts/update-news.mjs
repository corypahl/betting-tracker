import { readFile, writeFile } from "node:fs/promises";

const dataUrl = new URL("../data/news.json", import.meta.url);
const statusUrl = new URL("../data/statuses.json", import.meta.url);
const query = "Kalshi (state OR lawsuit OR court OR regulator) when:90d";
const feedUrl = new URL("https://news.google.com/rss/search");
const searchUrl = new URL("https://news.google.com/search");

for (const url of [feedUrl, searchUrl]) {
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function todayInNewYork() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function detectStates(title, states) {
  const aliases = {
    "District of Columbia": ["Washington, D.C.", "Washington D.C.", "D.C."],
    "New Mexico": ["N.M."],
    "New York": ["N.Y."],
    Pennsylvania: ["Penn."],
    Washington: ["Washington State", "Wash."],
  };

  return states
    .filter((state) => {
      const names = [state.name, ...(aliases[state.name] ?? [])];
      if (names.some((name) => title.toLowerCase().includes(name.toLowerCase()))) {
        return true;
      }

      return new RegExp(
        `(?:^|[^A-Za-z])${escapePattern(state.abbr)}(?:[^A-Za-z]|$)`,
      ).test(title);
    })
    .map((state) => ({ name: state.name, abbr: state.abbr }));
}

function parseArticles(xml, states) {
  const relevant =
    /\b(sue[sd]?|lawsuit|court|judge|legal|illegal|regulat(?:or|ion)|attorney general|ordered?|cease|halt|block|ban|restrain|enforc\w*|ruling|injunction|challenge|fight|case|operations?)\b/i;
  const articles = [];

  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const sourceMatch = item.match(/<source\s+url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
    const source = sourceMatch ? decodeXml(sourceMatch[2]) : "News source";
    const sourceUrl = sourceMatch ? decodeXml(sourceMatch[1]) : "";
    let title = tagValue(item, "title");

    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(` - ${source}`.length));
    }

    if (!/\bKalshi\b/i.test(title) || !relevant.test(title)) continue;

    const detectedStates = detectStates(title, states);
    if (detectedStates.length === 0) continue;

    const publishedAt = new Date(tagValue(item, "pubDate"));
    if (Number.isNaN(publishedAt.getTime())) continue;

    articles.push({
      title,
      url: tagValue(item, "link"),
      source,
      sourceUrl,
      publishedAt: publishedAt.toISOString(),
      states: detectedStates,
    });
  }

  articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const uniqueTitles = [];
  const seenTitles = new Set();
  for (const article of articles) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    uniqueTitles.push(article);
  }

  const diverse = [];
  const overflow = [];
  const seenStates = new Set();
  for (const article of uniqueTitles) {
    const primaryState = article.states[0].abbr;
    if (seenStates.has(primaryState)) overflow.push(article);
    else {
      seenStates.add(primaryState);
      diverse.push(article);
    }
  }

  return [...diverse, ...overflow].slice(0, 6);
}

async function updateNews() {
  const statuses = JSON.parse(await readFile(statusUrl, "utf8"));
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent":
        "market-map-daily-updater/1.0 (+https://github.com/corypahl/betting-tracker)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Google News request failed: HTTP ${response.status}`);
  }

  const items = parseArticles(await response.text(), statuses.states);
  if (items.length < 4) {
    throw new Error(`News parser returned only ${items.length} relevant headlines`);
  }

  const next = {
    generatedAt: todayInNewYork(),
    source: "Google News",
    query,
    queryUrl: searchUrl.toString(),
    items,
  };

  await writeFile(dataUrl, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`Updated ${items.length} Kalshi legal-challenge headlines.`);
}

try {
  await updateNews();
} catch (error) {
  const current = JSON.parse(await readFile(dataUrl, "utf8"));
  if (!Array.isArray(current.items) || current.items.length === 0) throw error;
  console.warn(`News refresh skipped; keeping prior headlines. ${error.message}`);
}
