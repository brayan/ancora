'use client';

import { useRef, useState } from 'react';
import { useCoaching } from '@/features/programming-practice/hooks/useCoaching';

export function CoachingRequest({
  attemptId,
  blocked,
  onBusyChange,
}: {
  attemptId: string;
  blocked: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const coaching = useCoaching(attemptId, onBusyChange);
  const [confirming, setConfirming] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const consent = useRef<HTMLDivElement>(null);
  const row = coaching.saved?.coaching;
  const canRequest =
    !row || (['failed', 'interrupted'].includes(row.state) && row.dispatches === 1);
  const disabled =
    blocked ||
    coaching.loading ||
    coaching.acting ||
    !!coaching.error ||
    !coaching.saved?.available ||
    !coaching.attempt;

  const share = async () => {
    setConfirming(false);
    await coaching.request();
    requestAnimationFrame(() => feedback.current?.focus());
  };

  return (
    <>
      {coaching.loading && <p role="status">Opening saved coaching…</p>}
      {!coaching.loading && !coaching.saved?.available && (
        <p>
          Coaching is unavailable. Saved feedback remains readable; enable coaching in the Python
          service to request it.
        </p>
      )}
      <div ref={feedback} tabIndex={-1} aria-label="Saved coaching feedback">
        {row?.state === 'ready' && row.feedback ? (
          <>
            <h3>Feedback for this saved attempt</h3>
            <p className="coachingContent">{row.feedback.summary}</p>
            <ul>
              {row.feedback.observations.map((text, index) => (
                <li key={index} className="coachingContent">
                  {text}
                </li>
              ))}
            </ul>
            <h3>Next step</h3>
            <p className="coachingContent">{row.feedback.nextStep}</p>
            <p className="scopeNote">
              AI feedback is advisory. The saved runner results and verdict are unchanged.
            </p>
          </>
        ) : row?.state === 'generating' || coaching.acting ? (
          <p role="status">
            Requesting coaching… Reloading resumes this request without sharing code again.
          </p>
        ) : row ? (
          <p role="status">
            {row.error === 'coaching_invalid'
              ? 'The feedback did not meet the output rules and was withheld.'
              : row.error === 'coaching_unavailable'
                ? 'The coaching service was unavailable.'
                : 'The request was interrupted; its dispatch allowance was used.'}{' '}
            Model requests used: {row.dispatches}/2.
            {row.dispatches === 2 ? ' No coaching retries remain for this attempt.' : ''}
          </p>
        ) : (
          !coaching.loading && <p>No coaching requested for this attempt.</p>
        )}
      </div>
      {coaching.error && (
        <p className="executionError" role="alert">
          {coaching.error}
        </p>
      )}
      {coaching.message && <p role="status">{coaching.message}</p>}
      {confirming && coaching.attempt && (
        <div
          ref={consent}
          className="coachingConsent"
          tabIndex={-1}
          aria-labelledby="sharing-heading"
        >
          <h3 id="sharing-heading">Share this saved code?</h3>
          <p>
            OpenAI ({coaching.saved?.model}) will receive the exact saved code below, the public
            challenge and an aggregate execution summary. Your current editor, reference solution,
            hidden case values, stdout and error text are excluded. Code may contain private
            information; review it before sharing.
          </p>
          <p>
            Selected attempt: <code>{coaching.attempt.id}</code> ·{' '}
            {coaching.attempt.mode === 'check' ? 'Check solution' : 'Run examples'}.{' '}
            {row
              ? 'This retry sends the same saved source again and uses the final model request.'
              : 'One model request now; at most one explicit retry.'}
          </p>
          <pre className="coachingSource">
            <code>{coaching.attempt.source}</code>
          </pre>
          <div className="runActions">
            <button
              type="button"
              className="button primary"
              disabled={disabled}
              onClick={() => {
                void share();
              }}
            >
              Share this saved code with OpenAI{row ? ' again' : ''}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={coaching.acting}
              onClick={() => setConfirming(false)}
            >
              Cancel code sharing
            </button>
          </div>
        </div>
      )}
      <div className="runActions">
        {canRequest && !confirming && (
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() => {
              setConfirming(true);
              requestAnimationFrame(() => consent.current?.focus());
            }}
          >
            {row ? 'Review code sharing for retry' : 'Review code sharing'}
          </button>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={coaching.loading || coaching.acting}
          onClick={() => {
            void coaching.refresh();
          }}
        >
          Refresh saved coaching
        </button>
      </div>
    </>
  );
}
