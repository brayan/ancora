"use client";

import type {
  CreatePastedSourceResponse,
  SourceSummary,
} from "@ancora/shared-types";
import { FormEvent, useState, useTransition } from "react";
import {
  sourceErrorMessages,
  sourcesEndpoint,
  sourceTextMaxLength,
} from "@/features/sources/constants";

type SourcesWorkspaceProps = Readonly<{
  initialSources: readonly SourceSummary[];
  isAuthenticated: boolean;
}>;

export function SourcesWorkspace({ initialSources, isAuthenticated }: SourcesWorkspaceProps) {
  const [sources, setSources] = useState<readonly SourceSummary[]>(initialSources);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      setError(sourceErrorMessages.unauthorized);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);

    startTransition(async () => {
      const response = await fetch(sourcesEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          text: formData.get("text"),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(sourceErrorMessages[payload?.error ?? ""] ?? "Unable to create source.");
        return;
      }

      const payload = (await response.json()) as CreatePastedSourceResponse;

      setSources((currentSources) => [payload.source, ...currentSources]);
      form.reset();
    });
  }

  return (
    <section className="sourceWorkspace" aria-labelledby="sources-heading">
      <form className="sourceComposer" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Sources</p>
          <h2 id="sources-heading">Paste learning material</h2>
        </div>
        <label>
          Title
          <input
            disabled={!isAuthenticated || isPending}
            maxLength={120}
            name="title"
            placeholder="Pasted source"
            type="text"
          />
        </label>
        <label>
          Text
          <textarea
            disabled={!isAuthenticated || isPending}
            maxLength={sourceTextMaxLength}
            name="text"
            required
            rows={9}
          />
        </label>
        <div className="sourceComposerFooter">
          <span>{sourceTextMaxLength.toLocaleString()} character limit</span>
          <button
            className="buttonLink primary"
            disabled={!isAuthenticated || isPending}
            type="submit"
          >
            {isPending ? "Saving source" : "Create source"}
          </button>
        </div>
        {error ? (
          <p className="formError" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="sourceListPanel" aria-busy={isPending} aria-live="polite">
        <div className="sourceListHeader">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Created sources</h2>
          </div>
          <strong>{sources.length}</strong>
        </div>

        {isPending ? <p className="sourceState">Saving pasted source...</p> : null}
        {sources.length === 0 ? (
          <p className="sourceState">No sources yet.</p>
        ) : (
          <ol className="sourceList">
            {sources.map((source) => (
              <li key={source.id}>
                <div>
                  <h3>{source.title}</h3>
                  <p>Source {source.id.slice(0, 8)}</p>
                </div>
                <dl>
                  <div>
                    <dt>Characters</dt>
                    <dd>{source.textCharacterCount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(source.createdAt)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
