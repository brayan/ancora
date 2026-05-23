import { StatusBadge } from "@ancora/ui";
import { SiteShell } from "@/components/layout/SiteShell";
import { LaneCard } from "@/components/ui/LaneCard";
import { homeLanes } from "@/features/home/constants";

export function HomeShell() {
  return (
    <main className="page">
      <header className="workspaceHeader">
        <div>
          <p className="eyebrow">Grounded study workspace</p>
          <h1>Ancora</h1>
          <p className="subtitle">
            Private learning sources, traceable cards, account-aware reviews, and synthetic evals share one product boundary.
          </p>
        </div>
        <StatusBadge className="statusBadge" tone="ready">
          Scaffold
        </StatusBadge>
      </header>

      <SiteShell>
        {homeLanes.map((lane) => (
          <LaneCard key={lane.title} {...lane} />
        ))}
      </SiteShell>
    </main>
  );
}
