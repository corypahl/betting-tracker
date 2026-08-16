# Market Map

An interactive U.S. map comparing current availability of:

- FanDuel Mobile Sportsbook
- Kalshi sports event contracts

The four map colors show every combination: neither, FanDuel only, Kalshi only,
or both. A dashed border flags a jurisdiction with an active Kalshi legal
challenge even when the product is still reported as available.

## Data and methodology

The site deliberately describes **product availability**, not a definitive legal
opinion. FanDuel status comes from its official [State of Play](https://www.fanduel.com/about/state-of-play)
page. Kalshi blocks come from a maintained [prediction-market state tracker](https://www.gamblingsite.com/prediction-markets/legal-states/),
with the [CFTC designation record](https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/42993)
included for federal context.

The scheduled GitHub Action runs daily. It refreshes `data/statuses.json` and a
Google News headline feed in `data/news.json`, validates the data, commits a
dated update when needed, builds the static site, and deploys it to GitHub Pages.

## Local development

```bash
npm ci
npm run dev
```

The GitHub Pages build can be checked locally with:

```bash
npm run build:pages
npm run preview:pages
```

Run the source refresh manually with `npm run update-data`.

## GitHub Pages

In the repository settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**. The workflow at `.github/workflows/deploy-pages.yml` handles
both daily refreshes and deployment.

This project is informational only. Users should confirm eligibility in the
relevant product before acting.
