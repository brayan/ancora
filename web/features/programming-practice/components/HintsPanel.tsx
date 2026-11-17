'use client';

import { useRef } from 'react';
import { useHints } from '@/features/programming-practice/hooks/useHints';

const levels = ['Conceptual nudge', 'Suggested approach', 'Pseudocode'];

export function HintsPanel({
  revisionId,
  blocked,
  onBusyChange,
}: {
  revisionId: string;
  blocked: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const hints = useHints(revisionId, onBusyChange);
  const latestHint = useRef<HTMLLIElement>(null);
  const requestMessage = useRef<HTMLParagraphElement>(null);
  const rows = hints.saved?.hints ?? [];
  const ready = rows.filter((hint) => hint.state === 'ready').length;
  const pending = rows.find((hint) => hint.state !== 'ready');
  const disabled =
    blocked || hints.acting || hints.loading || !hints.saved?.available || !!hints.error;

  const requestHint = async (level: number, retryId?: string) => {
    await hints.request(level, retryId);
    requestAnimationFrame(() => {
      if (latestHint.current?.dataset.level === String(level)) {
        latestHint.current.focus();
      } else {
        requestMessage.current?.focus();
      }
    });
  };

  return (
    <section className="hintsPanel" aria-labelledby="hints-heading">
      <div className="panelHeader">
        <h2 id="hints-heading">Progressive hints</h2>
        <span>{hints.saved?.model ? `OpenAI · ${hints.saved.model}` : 'Requested help'}</span>
      </div>
      <p className="generationNote">
        Start with a nudge, then an approach and pseudocode. Requests send this challenge and
        earlier hints to OpenAI. Your code, reference solution and hidden cases are not sent. Each
        level allows one model request and one explicit retry. A hint does not change your draft or
        verdict.
      </p>
      {hints.loading && <p role="status">Opening saved hints…</p>}
      {hints.acting && <p role="status">Requesting a hint… Your draft stays in the editor.</p>}
      {!hints.loading && !hints.saved?.available && (
        <p className="generationNote">
          Hint generation is unavailable. Saved hints remain readable; enable hints in the Python
          service to request more.
        </p>
      )}
      {rows.length === 0 && !hints.loading && <p>No hints requested for this revision.</p>}
      <ol className="hintHistory">
        {rows.map((hint) => (
          <li
            key={hint.id}
            data-level={hint.level}
            ref={hint.level === rows.at(-1)?.level ? latestHint : undefined}
            tabIndex={-1}
            aria-label={`Hint ${hint.level} · ${levels[hint.level - 1]}`}
          >
            <h3>
              Hint {hint.level} · {levels[hint.level - 1]}
            </h3>
            {hint.state === 'ready' ? (
              <p className="hintContent">{hint.content}</p>
            ) : hint.state === 'generating' ? (
              <p role="status">
                Generating hint {hint.level}… Reloading resumes this request without another model
                call.
              </p>
            ) : (
              <>
                <p role="status">
                  {hint.error === 'hint_invalid'
                    ? 'The hint did not meet the output rules and was withheld.'
                    : hint.error === 'hints_unavailable'
                      ? 'The hint service was unavailable.'
                      : 'The provider request was interrupted; its dispatch allowance was used.'}{' '}
                  Model requests used: {hint.dispatches}/2.
                </p>
                {hint.dispatches === 1 ? (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={disabled}
                    onClick={() => {
                      void requestHint(hint.level, hint.id);
                    }}
                  >
                    Retry hint {hint.level} · one more model request
                  </button>
                ) : (
                  <p>
                    No hint retries remain for this level. You can continue practising or reveal the
                    reference separately.
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      {hints.error && (
        <p className="executionError" role="alert">
          {hints.error}
        </p>
      )}
      {hints.message && (
        <p ref={requestMessage} tabIndex={-1} role="status">
          {hints.message}
        </p>
      )}
      <div className="runActions">
        {!pending && ready < 3 && (
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() => {
              void requestHint(ready + 1);
            }}
          >
            Get hint {ready + 1} · {levels[ready]}
          </button>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={hints.loading || hints.acting}
          onClick={() => {
            void hints.refresh();
          }}
        >
          Refresh saved hints
        </button>
      </div>
      {ready === 3 && (
        <p className="generationNote">
          All three hints are saved. The full reference remains a separate reveal action.
        </p>
      )}
    </section>
  );
}
