import type { Metadata } from "next";
import { Tracker } from "./Tracker";

export const metadata: Metadata = {
  title: "Market Map — FanDuel vs. Kalshi",
  description:
    "An interactive weekly map comparing FanDuel Sportsbook and Kalshi sports-contract availability across the United States.",
};

export default function Home() {
  return <Tracker />;
}
