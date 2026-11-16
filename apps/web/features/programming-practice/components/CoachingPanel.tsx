'use client';

import { useState } from 'react';
import type { PracticeSession } from '@ancora/shared-types';
import { CoachingRequest } from '@/features/programming-practice/components/CoachingRequest';

export function CoachingPanel({
  attempts,
  blocked,
  onBusyChange,
}: {
  attempts: PracticeSession['attempts'];
  blocked: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [selection, setSelection] = useState('');
  const selected = attempts.find((attempt) => attempt.id === selection && attempt.completed);
  const attemptId = selected?.id ?? attempts.find((attempt) => attempt.completed)?.id ?? '';
  return (
    <section className="coachingPanel" aria-labelledby="coaching-heading">
      <h2 id="coaching-heading">Attempt coaching</h2>
      <p className="generationNote">
        Choose a saved attempt for feedback. Review its exact code before sharing it with OpenAI.
        Coaching does not edit your draft or change your verdict.
      </p>
      {!attemptId ? (
        <p>Run examples or check your solution to save a completed attempt first.</p>
      ) : (
        <>
          <label htmlFor="coaching-attempt">Saved attempt for coaching</label>
          <select
            id="coaching-attempt"
            value={attemptId}
            disabled={blocked}
            onChange={(event) => setSelection(event.target.value)}
          >
            {attempts.map((attempt) => (
              <option key={attempt.id} value={attempt.id} disabled={!attempt.completed}>
                {attempt.mode === 'check' ? 'Check solution' : 'Run examples'} ·{' '}
                {new Date(attempt.createdAt).toLocaleString()} · {attempt.id.slice(0, 8)}
                {attempt.completed ? '' : ' · unfinished'}
              </option>
            ))}
          </select>
          <CoachingRequest
            key={attemptId}
            attemptId={attemptId}
            blocked={blocked}
            onBusyChange={onBusyChange}
          />
        </>
      )}
    </section>
  );
}
