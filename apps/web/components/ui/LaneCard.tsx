type LaneCardProps = Readonly<{
  title: string;
  summary: string;
  metric: string;
  label: string;
}>;

export function LaneCard({ title, summary, metric, label }: LaneCardProps) {
  return (
    <article className="lane">
      <h2>{title}</h2>
      <p>{summary}</p>
      <div className="laneMeta">
        <span>{label}</span>
        <strong>{metric}</strong>
      </div>
    </article>
  );
}
