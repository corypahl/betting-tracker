"use client";

import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import usTopology from "us-atlas/states-10m.json";
import trackerData from "../data/statuses.json";

type Category = "neither" | "fanduel-only" | "kalshi-only" | "both";
type Theme = "dark" | "light";
type StateStatus = (typeof trackerData.states)[number];

type MapFeature = {
  id?: string | number;
  properties?: { name?: string } | null;
  type: string;
};

const categoryInfo: Record<
  Category,
  { label: string; short: string; color: string; symbol: string }
> = {
  neither: {
    label: "Neither available",
    short: "Neither",
    color: "#7d8791",
    symbol: "× ×",
  },
  "fanduel-only": {
    label: "FanDuel only",
    short: "FD only",
    color: "#3c78e8",
    symbol: "✓ ×",
  },
  "kalshi-only": {
    label: "Kalshi only",
    short: "Kalshi only",
    color: "#2eae69",
    symbol: "× ✓",
  },
  both: {
    label: "Both available",
    short: "Both",
    color: "#f2c84b",
    symbol: "✓ ✓",
  },
};

const categoryOrder: Category[] = [
  "neither",
  "fanduel-only",
  "kalshi-only",
  "both",
];

const mapZoomOptions = [
  { label: "Fit", value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
] as const;

function categoryFor(state: StateStatus): Category {
  if (state.fanduel && state.kalshi) return "both";
  if (state.fanduel) return "fanduel-only";
  if (state.kalshi) return "kalshi-only";
  return "neither";
}

function productLabel(available: boolean) {
  return available ? "Available" : "Not available";
}

const mapWidth = 960;
const mapHeight = 590;

const compactLabelOffsets: Record<string, [number, number]> = {
  CT: [18, 7],
  MA: [23, -5],
  MD: [20, 10],
  NJ: [20, 6],
  RI: [31, 3],
};

const topology = usTopology as unknown as {
  objects: { states: unknown };
};

const stateCollection = feature(
  usTopology as never,
  topology.objects.states as never,
) as unknown as { features: MapFeature[]; type: string };

const projection = geoAlbersUsa().fitExtent(
  [
    [18, 18],
    [mapWidth - 18, mapHeight - 18],
  ],
  stateCollection as never,
);
const path = geoPath(projection);

function StatusMark({ available }: { available: boolean }) {
  return (
    <span
      className={"status-mark " + (available ? "status-mark--yes" : "status-mark--no")}
      aria-hidden="true"
    >
      {available ? "✓" : "×"}
    </span>
  );
}

export function Tracker() {
  const states = trackerData.states;
  const byFips = useMemo(
    () => new Map(states.map((state) => [state.fips, state])),
    [states],
  );
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set(categoryOrder),
  );
  const [selectedName, setSelectedName] = useState("California");
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [mapZoom, setMapZoom] = useState(1);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("market-map-theme");
    const initialTheme: Theme = storedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = initialTheme;
    const frame = window.requestAnimationFrame(() => setTheme(initialTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const counts = useMemo(() => {
    const next = Object.fromEntries(
      categoryOrder.map((category) => [category, 0]),
    ) as Record<Category, number>;
    states.forEach((state) => {
      next[categoryFor(state)] += 1;
    });
    return next;
  }, [states]);

  const visibleCount = categoryOrder.reduce(
    (sum, category) =>
      sum + (activeCategories.has(category) ? counts[category] : 0),
    0,
  );

  const displayedState =
    states.find((state) => state.name === hoveredName) ??
    states.find((state) => state.name === selectedName) ??
    states[0];

  const toggleCategory = (category: Category) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const showAll = () => setActiveCategories(new Set(categoryOrder));

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem("market-map-theme", next);
      return next;
    });
  };

  return (
    <main>
      <header className="site-header" id="top">
        <a className="wordmark" href="#top" aria-label="Market Map home">
          <span className="wordmark-dot" />
          MARKET MAP
        </a>
        <p className="header-context">
          FanDuel Sportsbook <span>×</span> Kalshi Sports Contracts
        </p>
        <div className="header-actions">
          <div className="header-meta">
            <span className="live-dot" />
            Updated weekly
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " mode"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <b>{theme === "dark" ? "Light" : "Dark"}</b>
          </button>
        </div>
      </header>

      <section className="tracker-shell" aria-labelledby="map-heading">
        <div className="tracker-toolbar">
          <div>
            <p className="section-kicker">U.S. MARKET ACCESS · 51 JURISDICTIONS</p>
            <h2 id="map-heading">What’s live where?</h2>
            <p className="tracker-intro">
              Filter and compare current FanDuel and Kalshi sports availability.
            </p>
          </div>
          <div className="toolbar-actions">
            <button className="reset-button" type="button" onClick={showAll}>
              Show all
            </button>
          </div>
        </div>

        <div className="filter-grid" aria-label="Availability filters">
          {categoryOrder.map((category) => {
            const info = categoryInfo[category];
            const active = activeCategories.has(category);
            return (
              <button
                type="button"
                className={"filter-card " + (active ? "is-active" : "")}
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                key={category}
                style={{ "--category-color": info.color } as React.CSSProperties}
              >
                <span className="filter-swatch" aria-hidden="true" />
                <span className="filter-copy">
                  <strong>{info.label}</strong>
                  <small>FanDuel · Kalshi&nbsp;&nbsp;{info.symbol}</small>
                </span>
                <span className="filter-count">{counts[category]}</span>
              </button>
            );
          })}
        </div>

        <div className="map-layout">
          <div className="map-card">
            <div className="map-meta-row">
              <div className="map-meta-copy">
                <span>Showing {visibleCount} of {states.length}</span>
                <span className="contested-key">
                  <i aria-hidden="true">AA</i> Red abbreviation + dotted border = active challenge
                </span>
              </div>
              <div className="map-size-control" role="group" aria-label="Map size">
                {mapZoomOptions.map((option) => (
                  <button
                    type="button"
                    className={"map-size-button " + (mapZoom === option.value ? "is-active" : "")}
                    aria-pressed={mapZoom === option.value}
                    onClick={() => setMapZoom(option.value)}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="map-scroll">
              <svg
                className="us-map"
                viewBox={"0 0 " + mapWidth + " " + mapHeight}
                role="img"
                aria-label="Interactive map of FanDuel and Kalshi availability by state"
                style={{ "--map-width": `${mapZoom * 100}%` } as React.CSSProperties}
              >
                {stateCollection.features.map((mapFeature) => {
                  const fips = String(mapFeature.id ?? "").padStart(2, "0");
                  const state = byFips.get(fips);
                  if (!state) return null;
                  const category = categoryFor(state);
                  const active = activeCategories.has(category);
                  const selected = displayedState.name === state.name;
                  const statePath = path(mapFeature as never) ?? "";
                  const labelPoint = path.centroid(mapFeature as never);
                  const compactOffset = state.kalshiContested
                    ? compactLabelOffsets[state.abbr]
                    : undefined;
                  const labelX = labelPoint[0] + (compactOffset?.[0] ?? 0);
                  const labelY = labelPoint[1] + (compactOffset?.[1] ?? 0);
                  const showLabel = Number.isFinite(labelPoint[0]) &&
                    (state.kalshiContested ||
                      !["CT", "DC", "DE", "MA", "MD", "NH", "NJ", "RI", "VT"].includes(state.abbr));
                  return (
                    <g key={state.fips}>
                      <path
                        d={statePath}
                        className={
                          "state-shape " +
                          (active ? "" : "is-filtered ") +
                          (selected ? "is-selected " : "") +
                          (state.kalshiContested ? "is-contested" : "")
                        }
                        fill={categoryInfo[category].color}
                        tabIndex={active ? 0 : -1}
                        role="button"
                        aria-label={
                          state.name + ": " + categoryInfo[category].label +
                          (state.kalshiContested ? ", active legal challenge" : "")
                        }
                        onMouseEnter={() => setHoveredName(state.name)}
                        onMouseLeave={() => setHoveredName(null)}
                        onFocus={() => setHoveredName(state.name)}
                        onBlur={() => setHoveredName(null)}
                        onClick={() => setSelectedName(state.name)}
                      >
                        <title>{state.name + " — " + categoryInfo[category].label}</title>
                      </path>
                      {showLabel && active ? (
                        <>
                          {compactOffset ? (
                            <line
                              className="state-label-leader is-contested"
                              x1={labelPoint[0]}
                              y1={labelPoint[1]}
                              x2={labelX - 5}
                              y2={labelY - 3}
                              aria-hidden="true"
                            />
                          ) : null}
                          <text
                            className={
                              "state-label " +
                              (state.kalshiContested ? "is-contested" : "")
                            }
                            x={labelX}
                            y={labelY}
                            aria-hidden="true"
                          >
                            {state.abbr}
                          </text>
                        </>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
            <p className="map-instruction">
              Fit shows the full map. Choose 1.5× or 2×, then swipe to inspect.
            </p>
          </div>

          <aside className="state-detail" aria-live="polite">
            <div className="detail-heading">
              <span
                className="detail-swatch"
                style={{ backgroundColor: categoryInfo[categoryFor(displayedState)].color }}
              />
              <div>
                <p>{displayedState.abbr}</p>
                <h3>{displayedState.name}</h3>
              </div>
            </div>

            <div className="product-status">
              <div>
                <span>FanDuel</span>
                <strong>Sportsbook</strong>
              </div>
              <p className={displayedState.fanduel ? "is-available" : "is-unavailable"}>
                <StatusMark available={displayedState.fanduel} />
                {productLabel(displayedState.fanduel)}
              </p>
            </div>
            <div className="product-status">
              <div>
                <span>Kalshi</span>
                <strong>Sports contracts</strong>
              </div>
              <p className={displayedState.kalshi ? "is-available" : "is-unavailable"}>
                <StatusMark available={displayedState.kalshi} />
                {productLabel(displayedState.kalshi)}
              </p>
            </div>

            {displayedState.kalshiContested ? (
              <div className="challenge-note">
                <span className="challenge-state-code">{displayedState.abbr}</span>
                <p>
                  {"note" in displayedState
                    ? displayedState.note
                    : "An active challenge could change access."}
                </p>
              </div>
            ) : (
              <div className="steady-note">
                No active state challenge is noted in the current source set.
              </div>
            )}

            <a
              className="source-link"
              href="https://www.gamblingsite.com/prediction-markets/legal-states/"
              target="_blank"
              rel="noreferrer"
            >
              Review the latest state notes <span aria-hidden="true">↗</span>
            </a>
          </aside>
        </div>
      </section>

      <section className="methodology" id="methodology">
        <div>
          <p className="section-kicker">READ THE MAP CORRECTLY</p>
          <h2>Availability, not legal advice.</h2>
        </div>
        <div className="methodology-copy">
          <p>
            “Available” means the product is reported as live for eligible users
            in that jurisdiction. Kalshi is a federally designated contract market,
            but states and courts disagree about sports event contracts. A dashed
            outline flags an active challenge even when trading remains live.
          </p>
          <p>
            FanDuel data comes from its official product-availability page. Kalshi
            blocks are drawn from documented court orders in the state tracker.
            Always confirm eligibility in the product before acting.
          </p>
          <div className="source-list">
            {trackerData.sources.map((source, index) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {source.label}
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span>MARKET MAP</span>
        <p>Data checked {trackerData.generatedAt} · For informational purposes only.</p>
        <a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noreferrer">
          Responsible play resources ↗
        </a>
      </footer>
    </main>
  );
}
