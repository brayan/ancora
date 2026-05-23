type SiteShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function SiteShell({ children }: SiteShellProps) {
  return <section className="workspaceGrid">{children}</section>;
}
