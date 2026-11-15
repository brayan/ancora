import type { PracticeSession } from '@ancora/shared-types';

export function AttemptHistory({
  attempts,
  disabled,
  onView,
}: {
  attempts: PracticeSession['attempts'];
  disabled: boolean;
  onView: (id: string) => Promise<void>;
}) {
  return (
    <section className="attemptHistory" aria-labelledby="history-heading">
      <h2 id="history-heading">Recent attempts</h2>
      {attempts.length === 0 ? (
        <p>Run examples or check your solution to save your first attempt.</p>
      ) : (
        <ul>
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <span>
                {attempt.mode === 'check' ? 'Check solution' : 'Run examples'} ·{' '}
                {new Date(attempt.createdAt).toLocaleString()} ·{' '}
                {attempt.completed ? 'Saved' : 'Unfinished'}
                <span className="attemptAssistance">
                  {attempt.solutionRevealed
                    ? 'Reference revealed before submission'
                    : 'No recorded reveal before submission'}
                </span>
                <span className="attemptHintAssistance">
                  {attempt.hintLevel > 0
                    ? `Hint level ${attempt.hintLevel} recorded before submission`
                    : 'No recorded hints before submission'}
                </span>
                <span className="attemptCoachingAssistance">
                  {attempt.coachingAvailable
                    ? 'Coaching available before submission'
                    : 'No recorded coaching before submission'}
                </span>
              </span>
              <button
                type="button"
                className="button secondary"
                disabled={disabled}
                onClick={() => {
                  void onView(attempt.id);
                }}
              >
                View attempt
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
