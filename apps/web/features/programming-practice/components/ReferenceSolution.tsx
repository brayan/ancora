'use client';

import { useEffect, useRef, useState } from 'react';
import type { RunEnvelope } from '@ancora/shared-types';

export function ReferenceSolution({
  revealedAt,
  blocked,
  runnerAvailable,
  onReveal,
  onRun,
  onBusyChange,
}: {
  revealedAt: string | null;
  blocked: boolean;
  runnerAvailable: boolean;
  onReveal: () => Promise<RunEnvelope>;
  onRun: (envelope: RunEnvelope) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [opening, setOpening] = useState(false);
  const [envelope, setEnvelope] = useState<RunEnvelope | null>(null);
  const [error, setError] = useState('');
  const revealButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const solution = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (confirming) {
      confirmButton.current?.focus();
    }
  }, [confirming]);

  useEffect(() => {
    if (envelope) {
      solution.current?.focus();
    }
  }, [envelope]);

  const reveal = async () => {
    setOpening(true);
    setError('');
    onBusyChange(true);
    try {
      setEnvelope(await onReveal());
      setConfirming(false);
    } catch {
      setError('The solution could not open. Your draft is preserved. Retry to open it.');
    } finally {
      setOpening(false);
      onBusyChange(false);
    }
  };

  return (
    <section className="referenceSolution" aria-labelledby="reference-heading">
      <h2 id="reference-heading">Reference solution</h2>
      <p className="generationNote">
        Compare with the reference when you want help. Your draft stays in the editor. Revealing the
        solution records assistance for future attempts on this revision.
      </p>
      {revealedAt && (
        <p className="assistanceStatus" role="status">
          Solution reveal recorded · {new Date(revealedAt).toLocaleString()}
        </p>
      )}
      {!envelope && !confirming && (
        <button
          ref={revealButton}
          type="button"
          className="button secondary"
          disabled={blocked || opening}
          onClick={() => {
            if (revealedAt) {
              void reveal();
            } else {
              setConfirming(true);
            }
          }}
        >
          {opening
            ? 'Opening solution…'
            : revealedAt
              ? 'Show revealed solution'
              : 'Reveal solution'}
        </button>
      )}
      {confirming && (
        <div role="group" aria-label="Confirm solution reveal">
          <p id="reveal-warning">
            This will show the complete solution and permanently record the reveal. Earlier attempts
            stay unchanged.
          </p>
          <div className="runActions">
            <button
              ref={confirmButton}
              type="button"
              className="button primary"
              disabled={blocked || opening}
              aria-describedby="reveal-warning"
              onClick={() => {
                void reveal();
              }}
            >
              {opening ? 'Opening solution…' : 'Reveal and record assistance'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={opening}
              onClick={() => {
                setConfirming(false);
                setError('');
                // The reveal control remounts after cancelling the confirmation.
                requestAnimationFrame(() => revealButton.current?.focus());
              }}
            >
              Cancel reveal
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="executionError" role="alert">
          {error}
        </p>
      )}
      {envelope && (
        <>
          <pre
            ref={solution}
            className="output referenceCode"
            tabIndex={0}
            aria-label="Revealed reference code"
          >
            <code>{envelope.request.source}</code>
          </pre>
          <div className="runActions">
            <button
              type="button"
              className="button secondary"
              disabled={blocked || !runnerAvailable}
              onClick={() => {
                void onRun(envelope);
              }}
            >
              Run reference separately
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={blocked}
              onClick={() => {
                setEnvelope(null);
                requestAnimationFrame(() => revealButton.current?.focus());
              }}
            >
              Hide solution
            </button>
          </div>
        </>
      )}
    </section>
  );
}
