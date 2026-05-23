import type { HomeLane } from "./types";

export const homeLanes = [
  {
    title: "Sources",
    summary: "Account-owned learning material starts as pasted text before uploaded files are introduced.",
    metric: "0",
    label: "Ready",
  },
  {
    title: "Decks",
    summary: "Generated and edited cards will remain traceable to prompt versions and source chunks.",
    metric: "0",
    label: "Planned",
  },
  {
    title: "Reviews",
    summary: "Study interactions will record card version, result, timing, and scheduling impact.",
    metric: "0",
    label: "Planned",
  },
  {
    title: "Evals",
    summary: "Smoke checks run from synthetic data and never require private source material.",
    metric: "1",
    label: "Lane",
  },
] as const satisfies readonly HomeLane[];
