import { readFile, writeFile } from "node:fs/promises";

const dataUrl = new URL("../data/statuses.json", import.meta.url);
const fanDuelUrl = "https://www.fanduel.com/about/state-of-play";
const kalshiTrackerUrl =
  "https://www.gamblingsite.com/prediction-markets/legal-states/";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "market-map-daily-updater/1.0 (+https://github.com/corypahl/betting-tracker)",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch " + url + ": HTTP " + response.status);
  }

  return response.text();
}

function parseFanDuel(html) {
  const results = new Map();
  const pattern =
    /\\"territoryName\\":\\"([^\\"]+)\\"[\s\S]*?\\"productName\\":\\"Mobile Sportsbook\\",\\"status\\":\\"([^\\"]+)\\"/g;

  for (const match of html.matchAll(pattern)) {
    const name = match[1] === "Washington, D.C." ? "District of Columbia" : match[1];
    results.set(name, match[2] === "Available");
  }

  return results;
}

function parseKalshiBlocks(html) {
  const start = html.indexOf("Where Sports Contracts Are Blocked Right Now");
  const end = html.indexOf('id="statutes"', start);

  if (start < 0 || end < 0) {
    throw new Error("Kalshi block section was not found in the state tracker");
  }

  const section = html.slice(start, end);
  const blocked = new Set();

  for (const match of section.matchAll(/<li><strong>([A-Za-z .]+):<\/strong>/g)) {
    blocked.add(match[1].trim());
  }

  if (blocked.size === 0 || blocked.size > 15) {
    throw new Error("Kalshi block parser returned an unexpected state count");
  }

  return blocked;
}

const current = JSON.parse(await readFile(dataUrl, "utf8"));
const [fanDuelHtml, kalshiHtml] = await Promise.all([
  fetchText(fanDuelUrl),
  fetchText(kalshiTrackerUrl),
]);

const fanDuel = parseFanDuel(fanDuelHtml);
const kalshiBlocks = parseKalshiBlocks(kalshiHtml);
const expectedStates = current.states.map((state) => state.name);
const missingFanDuelStates = expectedStates.filter((name) => !fanDuel.has(name));

if (missingFanDuelStates.length > 0) {
  throw new Error(
    "FanDuel parser missed: " + missingFanDuelStates.join(", "),
  );
}

for (const blockedState of kalshiBlocks) {
  if (!expectedStates.includes(blockedState)) {
    throw new Error("Kalshi parser returned an unknown state: " + blockedState);
  }
}

const states = current.states.map((state) => {
  const kalshi = !kalshiBlocks.has(state.name);
  let note = state.note;

  if (!kalshi) {
    note =
      "The current source reports a court-ordered block on Kalshi sports contracts.";
  } else if (!state.kalshi && state.kalshiContested) {
    note =
      "The prior block is no longer reported as in force; an active challenge may remain.";
  }

  const next = {
    ...state,
    fanduel: fanDuel.get(state.name),
    kalshi,
    kalshiContested: state.kalshiContested || !kalshi,
  };

  if (note) next.note = note;
  return next;
});

const next = {
  ...current,
  generatedAt: new Date().toISOString().slice(0, 10),
  states,
};

await writeFile(dataUrl, JSON.stringify(next, null, 2) + "\n", "utf8");

console.log(
  "Updated " +
    states.length +
    " jurisdictions; Kalshi blocks: " +
    [...kalshiBlocks].sort().join(", "),
);
