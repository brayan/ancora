'use client';

import { useRef, useState } from 'react';
import { StatusBadge } from '@ancora/ui';
import { MAX_SOURCE_LENGTH, parseRunnerResponse, type RunnerResponse } from '@/runner/protocol.mjs';
import { RUNNER_ORIGIN } from '@/features/programming-practice/constants';
import { usePracticeRunner } from '@/features/programming-practice/hooks/usePracticeRunner';
import { usePracticeSession } from '@/features/programming-practice/hooks/usePracticeSession';
import { PracticeResults } from '@/features/programming-practice/components/PracticeResults';

type Display = { report: RunnerResponse | null; label: string; source: string };

export function PracticeScreen() {
  const practice = usePracticeSession();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runner = usePracticeRunner(frameRef);
  const [preparing, setPreparing] = useState(false);
  const [display, setDisplay] = useState<Display | null>(null);
  const [error, setError] = useState('');
  const submission = useRef<{ id: string; source: string; mode: 'examples' | 'check' } | null>(
    null
  );
  const busy = preparing || runner.busy;
  const available = !['connecting', 'unavailable'].includes(runner.state.status);
  const validSource =
    practice.source.trim().length > 0 && practice.source.length <= MAX_SOURCE_LENGTH;
  const ready =
    !!practice.session && !['loading', 'error', 'conflict'].includes(practice.saveState);
  const latest = practice.session?.latestAttempt;
  const response = display ? display.report : parseRunnerResponse(latest?.report);

  const execute = async (mode: 'examples' | 'check') => {
    setPreparing(true);
    setError('');
    const source = practice.source;
    setDisplay({ report: null, label: 'Your solution', source });
    if (
      !submission.current ||
      submission.current.source !== source ||
      submission.current.mode !== mode
    ) {
      submission.current = { id: crypto.randomUUID(), source, mode };
    }
    try {
      const envelope = await practice.prepare(mode, submission.current.id);
      submission.current = null;
      setPreparing(false);
      const report = parseRunnerResponse(envelope.report) ?? (await runner.run(envelope.request));
      if (!report || !envelope.attemptId) {
        throw new Error('run_interrupted');
      }
      setDisplay({ report, label: 'Your solution', source: envelope.request.source });
      await practice.persistReport(envelope.attemptId, report);
    } catch {
      setError(
        'The attempt could not finish saving. Your draft is preserved. Retry the action or save the pending result below.'
      );
    } finally {
      setPreparing(false);
    }
  };

  const reference = async (load: boolean) => {
    setPreparing(true);
    setError('');
    try {
      const envelope = await practice.reference();
      if (load) {
        practice.edit(envelope.request.source);
      } else {
        setDisplay({ report: null, label: 'Reference solution', source: envelope.request.source });
        setPreparing(false);
        const report = await runner.run(envelope.request);
        setDisplay({ report, label: 'Reference solution', source: envelope.request.source });
      }
    } catch {
      setError('The reference could not open. Your draft is preserved; try again.');
    } finally {
      setPreparing(false);
    }
  };

  const viewAttempt = async (id: string) => {
    try {
      const saved = await practice.viewAttempt(id);
      setDisplay({
        report: parseRunnerResponse(saved.report),
        label: 'Saved attempt',
        source: saved.source,
      });
      setError(
        saved.report
          ? ''
          : 'This submission has no saved result. Run your draft again to create another attempt.'
      );
    } catch {
      setError('The saved attempt could not open. Your draft is preserved; try again.');
    }
  };

  return (
    <main className="practicePage">
      <header className="practiceHeader">
        <a href="/practice" className="brand">
          Ancora
        </a>
        <StatusBadge className="statusBadge" tone="ready">
          Local Python practice
        </StatusBadge>
      </header>
      {!practice.session ? (
        <section className="sessionState" aria-live="polite">
          <h1>
            {practice.saveState === 'loading' ? 'Opening your practice' : 'Practice unavailable'}
          </h1>
          <p>{practice.message}</p>
          {practice.saveState === 'error' && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                void practice.open();
              }}
            >
              Retry opening practice
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="practiceIntro">
            <h1>{practice.session.challenge.title}</h1>
            <p>{practice.session.challenge.objective}</p>
          </div>
          <div className="practiceWorkspace">
            <section className="challengePanel" aria-labelledby="challenge-heading">
              <h2 id="challenge-heading">The challenge</h2>
              <p>{practice.session.challenge.statement}</p>
              <pre className="signature">
                <code>{practice.session.challenge.signature}</code>
              </pre>
              <ul className="requirements">
                {practice.session.challenge.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Examples</h3>
              <div className="examples">
                {practice.session.challenge.publicCases.map((example) => (
                  <div key={example.id}>
                    <code>{JSON.stringify(example.input)}</code>
                    <span>
                      returns <code>{JSON.stringify(example.expected)}</code>
                    </span>
                  </div>
                ))}
              </div>
              <p className="scopeNote">
                Fixed practice exercise · revision 1. Challenge generation and coaching come later.
              </p>
            </section>
            <section className="editorPanel" aria-labelledby="solution-heading">
              <div className="panelHeader">
                <h2 id="solution-heading">Your solution</h2>
                <span>Python · one pure function</span>
              </div>
              <label className="visuallyHidden" htmlFor="python-solution">
                Python solution
              </label>
              <textarea
                id="python-solution"
                className="codeEditor"
                value={practice.source}
                onChange={(event) => practice.edit(event.target.value)}
                wrap="off"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                disabled={preparing}
                maxLength={MAX_SOURCE_LENGTH}
                aria-describedby="editor-note draft-status"
              />
              <p id="editor-note" className="editorNote">
                Drafts and submitted snapshots are saved to your local database. Browser recovery
                keeps edits while a save is pending.
              </p>
              {!practice.recoveryAvailable && (
                <p className="executionError" role="alert">
                  Browser recovery storage is unavailable. Keep this tab open until the draft and
                  result are saved.
                </p>
              )}
              <div className="draftStatus" aria-live="polite">
                <p id="draft-status">{practice.message}</p>
                <button
                  type="button"
                  className="button secondary"
                  disabled={
                    practice.saveState === 'loading' ||
                    practice.saveState === 'saving' ||
                    !!practice.conflict
                  }
                  onClick={() => {
                    void practice.save();
                  }}
                >
                  {practice.saveState === 'error' ? 'Retry save' : 'Save draft'}
                </button>
              </div>
              {practice.conflict && (
                <div className="draftConflict" role="alert">
                  <p>
                    Your editor contains your version. Choose explicitly before saving over the
                    other draft.
                  </p>
                  <div className="runActions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => practice.chooseDraft(true)}
                    >
                      Keep my edits
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => practice.chooseDraft(false)}
                    >
                      Use database draft
                    </button>
                  </div>
                </div>
              )}
              <div className="runActions">
                <button
                  type="button"
                  className="button primary"
                  disabled={
                    !ready || !available || busy || !validSource || !!practice.pendingReport
                  }
                  onClick={() => {
                    void execute('examples');
                  }}
                >
                  Run examples
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={
                    !ready || !available || busy || !validSource || !!practice.pendingReport
                  }
                  onClick={() => {
                    void execute('check');
                  }}
                >
                  Check solution
                </button>
                <button
                  type="button"
                  className="button stop"
                  disabled={!runner.busy}
                  onClick={runner.stop}
                >
                  Stop
                </button>
              </div>
              <p className="runnerStatus" role="status">
                {preparing ? 'Saving this submission…' : runner.state.label}
              </p>
              {runner.state.status === 'unavailable' && (
                <button type="button" className="button secondary" onClick={runner.reconnect}>
                  Reconnect runner
                </button>
              )}
              {error && (
                <p className="executionError" role="alert">
                  {error}
                </p>
              )}
              {practice.pendingReport && (
                <div className="pendingResult" role="status">
                  <p>
                    A result is waiting to be saved. Your submitted snapshot is already in the
                    database.
                  </p>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={practice.reportSaving}
                    onClick={() => {
                      const pending = practice.pendingReport;
                      if (pending) {
                        void practice
                          .persistReport(pending.id, pending.report)
                          .then(() => setError(''))
                          .catch(() =>
                            setError(
                              'The result could not be saved. Keep this page open and retry.'
                            )
                          );
                      }
                    }}
                  >
                    Retry saving result
                  </button>
                </div>
              )}
            </section>
          </div>
          <PracticeResults
            response={response}
            label={display?.label ?? 'Latest saved attempt'}
            source={display?.source ?? latest?.source}
          />
          {!display && latest && !latest.report && (
            <p className="scopeNote">
              Your last submission has no saved result. Run again to create another attempt.
            </p>
          )}
          <section className="attemptHistory" aria-labelledby="history-heading">
            <h2 id="history-heading">Recent attempts</h2>
            {practice.session.attempts.length === 0 ? (
              <p>Run examples or check your solution to save your first attempt.</p>
            ) : (
              <ul>
                {practice.session.attempts.map((attempt) => (
                  <li key={attempt.id}>
                    <span>
                      {attempt.mode === 'check' ? 'Check solution' : 'Run examples'} ·{' '}
                      {new Date(attempt.createdAt).toLocaleString()} ·{' '}
                      {attempt.completed ? 'Saved' : 'Unfinished'}
                    </span>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        void viewAttempt(attempt.id);
                      }}
                    >
                      View attempt
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <details className="spikeTools">
            <summary>Runner spike tools and limits</summary>
            <p>
              Each run uses a disposable worker on a separate origin. Results are local self-study
              evidence. The browser has no hard memory quota. Reference runs are separate from your
              saved attempts.
            </p>
            <div className="runActions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  void reference(true);
                }}
              >
                Load reference solution
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || !available}
                onClick={() => {
                  void reference(false);
                }}
              >
                Run reference separately
              </button>
            </div>
          </details>
        </>
      )}
      <iframe
        ref={frameRef}
        key={runner.frameVersion}
        src={RUNNER_ORIGIN}
        title="Isolated Python execution context"
        className="runnerFrame"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        onLoad={runner.connect}
      />
    </main>
  );
}
