'use client';

import { useState, type FormEvent } from 'react';
import { generationRequestSchema, type GenerationRequest } from '@ancora/schemas';
import type { RunRequest, RunnerResponse } from '@/runner/protocol.mjs';
import { useGeneration } from '@/features/programming-practice/hooks/useGeneration';

type GenerationPanelProps = {
  onGenerateSave: () => Promise<boolean>;
  onSelect: (revisionId: string) => Promise<boolean>;
  run: (request: RunRequest) => Promise<RunnerResponse | null>;
  onBusyChange: (busy: boolean) => void;
  blocked: boolean;
  runnerAvailable: boolean;
  currentRevisionId: string;
  challenges: readonly { revisionId: string; title: string }[];
};
const stateMessages = {
  generating: 'Generation is unfinished. Refresh its status before continuing.',
  validating: 'The candidate needs a reference check in your isolated browser runner.',
  correction_available: 'Reference checks did not pass. You can request one correction.',
  ready: 'The reference passed its checks. Open the challenge when you are ready.',
  rejected: 'This candidate did not pass its checks. Your current challenge is still open.',
  interrupted: 'The provider request was interrupted. It will not be repeated automatically.',
};
const initialRequest: GenerationRequest = {
  language: 'python',
  concept: 'collections',
  difficulty: 'beginner',
  goal: 'Practise one useful Python function.',
  targetMinutes: 10,
  preferences: '',
};

export function GenerationPanel({
  onGenerateSave,
  onSelect,
  run,
  onBusyChange,
  blocked,
  runnerAvailable,
  currentRevisionId,
  challenges,
}: GenerationPanelProps) {
  const generation = useGeneration({ onGenerateSave, run, onBusyChange });
  const [request, setRequest] = useState<GenerationRequest>(initialRequest);
  const [selectionError, setSelectionError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const choices = generation.pendingStart?.request ?? request;
  const saved = generation.generation;
  const busy = blocked || generation.busy || selecting;
  const unfinished = saved && ['generating', 'validating'].includes(saved.state);
  const canCorrect =
    saved?.dispatches === 1 && ['correction_available', 'interrupted'].includes(saved.state);
  const fieldsDisabled =
    busy ||
    generation.loading ||
    !generation.available ||
    !!generation.pendingStart ||
    !!unfinished;

  const select = async (revisionId: string) => {
    setSelecting(true);
    setSelectionError('');
    try {
      if (!(await onSelect(revisionId))) {
        setSelectionError('Save or resolve your current draft before opening another challenge.');
      }
    } catch {
      setSelectionError('The challenge could not open. Your current draft is preserved; retry.');
    } finally {
      setSelecting(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = generationRequestSchema.safeParse(choices);
    if (parsed.success) {
      void generation.start(parsed.data);
    }
  };

  return (
    <section className="generationPanel" aria-labelledby="generation-heading">
      <div className="panelHeader">
        <h2 id="generation-heading">Generate your next challenge</h2>
        <span>
          {generation.model ? `OpenAI · ${generation.model}` : 'Python · concept practice'}
        </span>
      </div>
      <p className="generationNote">
        Generation sends your choices to the configured OpenAI model. Each Generate action allows
        one model request, with at most one correction requested separately. Your solution is not
        sent.
      </p>
      <form onSubmit={submit}>
        <fieldset className="generationFields" disabled={fieldsDisabled}>
          <legend className="visuallyHidden">Challenge choices</legend>
          <div>
            <label htmlFor="generation-concept">Concept</label>
            <select
              id="generation-concept"
              value={choices.concept}
              onChange={(event) =>
                setRequest({
                  ...choices,
                  concept: generationRequestSchema.shape.concept.parse(event.target.value),
                })
              }
            >
              <option value="collections">Collections</option>
              <option value="comprehensions">Comprehensions</option>
              <option value="dictionaries">Dictionaries</option>
              <option value="strings">Strings</option>
              <option value="functions">Functions</option>
            </select>
          </div>
          <div>
            <label htmlFor="generation-difficulty">Difficulty</label>
            <select
              id="generation-difficulty"
              value={choices.difficulty}
              onChange={(event) =>
                setRequest({
                  ...choices,
                  difficulty: generationRequestSchema.shape.difficulty.parse(event.target.value),
                })
              }
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
            </select>
          </div>
          <div>
            <label htmlFor="generation-duration">Practice time</label>
            <select
              id="generation-duration"
              value={choices.targetMinutes}
              onChange={(event) =>
                setRequest({ ...choices, targetMinutes: Number(event.target.value) })
              }
            >
              {[5, 10, 15, 20, 30].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="generationGoal">
            <label htmlFor="generation-goal">Learning goal</label>
            <input
              id="generation-goal"
              value={choices.goal}
              onChange={(event) => setRequest({ ...choices, goal: event.target.value })}
              required
              maxLength={300}
            />
          </div>
          <div className="generationPreferences">
            <label htmlFor="generation-preferences">Preferences (optional)</label>
            <input
              id="generation-preferences"
              value={choices.preferences}
              onChange={(event) => setRequest({ ...choices, preferences: event.target.value })}
              maxLength={300}
              placeholder="For example, practise counting words"
            />
          </div>
        </fieldset>
        <div className="runActions">
          <button
            type="submit"
            className="button primary"
            disabled={fieldsDisabled || !runnerAvailable || choices.goal.trim().length === 0}
          >
            Generate challenge
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy || generation.loading}
            onClick={() => {
              void generation.refresh();
            }}
          >
            Refresh generation status
          </button>
        </div>
      </form>
      {!generation.loading && !generation.available && (
        <p className="generationNote">
          Generation is unavailable. Follow the local generation setup in the README, start the
          practice service, then refresh status. You can keep practising the current challenge.
        </p>
      )}
      {!runnerAvailable && (
        <p className="generationNote">
          Reconnect the runner before generating or validating a challenge.
        </p>
      )}
      {saved && (
        <div className="generationState" aria-live="polite">
          <h3>{saved.title ?? 'Challenge candidate'}</h3>
          <p>{stateMessages[saved.state]}</p>
          {saved.error === 'validation_interrupted' && (
            <p>
              Validation paused. Resume the reference check in a fresh runner; no model call is
              made.
            </p>
          )}
          <p className="generationNote">
            Model requests used: {saved.dispatches}/2. Reference checks are local self-study
            evidence and do not prove the challenge statement is correct.
          </p>
          <div className="runActions">
            {saved.state === 'validating' && !generation.pendingReport && (
              <button
                type="button"
                className="button secondary"
                disabled={busy || !runnerAvailable}
                onClick={() => {
                  void generation.resume();
                }}
              >
                Resume validation
              </button>
            )}
            {canCorrect && (
              <button
                type="button"
                className="button secondary"
                disabled={busy || !generation.available || !runnerAvailable}
                onClick={() => {
                  void generation.correct();
                }}
              >
                Request one correction
              </button>
            )}
            {saved.state === 'ready' && saved.revisionId && (
              <button
                type="button"
                className="button primary"
                disabled={busy || saved.revisionId === currentRevisionId}
                onClick={() => {
                  if (saved.revisionId) {
                    void select(saved.revisionId);
                  }
                }}
              >
                {saved.revisionId === currentRevisionId ? 'Challenge is open' : 'Open challenge'}
              </button>
            )}
          </div>
        </div>
      )}
      {generation.pendingStart && (
        <div className="pendingResult" role="status">
          <p>
            The generation request could not be confirmed. Retry with the same request ID to avoid a
            second initial model call.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={busy || !generation.available || !runnerAvailable}
            onClick={() => {
              if (generation.pendingStart) {
                void generation.start(generation.pendingStart.request);
              }
            }}
          >
            Retry generation request
          </button>
        </div>
      )}
      {generation.pendingReport && (
        <div className="pendingResult" role="status">
          <p>
            The reference result is waiting to be saved. Retry saving it without rerunning Python or
            calling the model.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              void generation.retryReport();
            }}
          >
            Retry saving validation
          </button>
        </div>
      )}
      {!generation.recoveryAvailable && (
        <p className="executionError" role="alert">
          Browser recovery is unavailable. Keep this tab open until generation and its validation
          result are saved.
        </p>
      )}
      {generation.message && (
        <p className="generationNote" role="status">
          {generation.message}
        </p>
      )}
      {generation.error && (
        <p className="executionError" role="alert">
          {generation.error}
        </p>
      )}
      {selectionError && (
        <p className="executionError" role="alert">
          {selectionError}
        </p>
      )}
      {challenges.length > 1 && (
        <div className="challengeHistory">
          <label htmlFor="saved-challenge">Open a saved challenge</label>
          <select
            id="saved-challenge"
            value={currentRevisionId}
            disabled={busy}
            onChange={(event) => {
              void select(event.target.value);
            }}
          >
            {challenges.map((challenge) => (
              <option key={challenge.revisionId} value={challenge.revisionId}>
                {challenge.title}
              </option>
            ))}
          </select>
          <span className="generationNote">
            Fixed practice, your current challenge and the most recent ready challenges, up to 20.
          </span>
        </div>
      )}
    </section>
  );
}
