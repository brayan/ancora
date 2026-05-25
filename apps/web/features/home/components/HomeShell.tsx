import { StatusBadge } from "@ancora/ui";
import { SiteShell } from "@/components/layout/SiteShell";
import { LaneCard } from "@/components/ui/LaneCard";
import { AuthStatus } from "@/features/auth/components/AuthStatus";
import { homeLanes } from "@/features/home/constants";

type HomeShellProps = Readonly<{
  user: {
    email: string | null | undefined;
    accountId: string;
  } | null;
}>;

export function HomeShell({ user }: HomeShellProps) {
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
        <div className="headerActions">
          <StatusBadge className="statusBadge" tone={user ? "ready" : "warning"}>
            {user ? "Authenticated" : "Signed out"}
          </StatusBadge>
          <AuthStatus user={user} />
        </div>
      </header>

      <SiteShell>
        {homeLanes.map((lane) => (
          <LaneCard key={lane.title} {...lane} />
        ))}
      </SiteShell>
    </main>
  );
}
