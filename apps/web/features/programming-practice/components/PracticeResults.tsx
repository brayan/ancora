import type { RunnerResponse } from '@/runner/protocol.mjs';

const failureMessages = {
  bootstrap_error: 'Python could not start. Check the local runner and try again.',
  execution_error: 'The execution context failed. Try a fresh run.',
  timeout: 'Time limit reached (2 seconds). Check for an infinite loop and run again.',
  stopped: 'Execution stopped. The next run starts with a fresh Python runtime.',
  output_limit: 'Output limit reached (8,000 characters). Reduce printing and run again.',
  invalid_message: 'The runner returned an invalid report. Start a fresh run.',
};

export function PracticeResults({
  response,
  label,
  source,
  technique,
}: {
  response: RunnerResponse | null;
  label: string;
  source: string | undefined;
  technique?: 'none' | 'list_comprehension' | 'dict_comprehension';
}) {
  const passed =
    response?.type === 'result' ? response.cases.filter((item) => item.passed).length : 0;
  const techniqueName =
    technique === 'dict_comprehension' ? 'Dictionary comprehension' : 'List comprehension';
  const techniqueMessages = {
    passed: `${techniqueName} verified`,
    failed: `${techniqueName} required`,
    inconclusive: 'Inconclusive — unsupported code pattern',
    not_required: 'No technique requirement',
  };
  return (
    <section className="resultsPanel" aria-labelledby="results-heading">
      <div className="panelHeader">
        <h2 id="results-heading">Results{response ? ` · ${label}` : ''}</h2>
        <span>Behavior and technique are checked separately</span>
      </div>
      {!response && (
        <p className="emptyResults">Run the examples to see what your function returns.</p>
      )}
      {response?.type === 'failure' && (
        <p className="executionError" role="alert">
          {failureMessages[response.code]}
        </p>
      )}
      {response?.type === 'result' && (
        <>
          {response.error && (
            <p className="executionError" role="alert">
              {response.error}
            </p>
          )}
          <div className="resultSummary">
            <p>
              <strong>Behavior</strong>
              <span>
                {passed}/{response.cases.length} cases passed{response.error ? ' before error' : ''}
              </span>
            </p>
            <p>
              <strong>Technique</strong>
              <span>{techniqueMessages[response.technique]}</span>
            </p>
            <p>
              <strong>Timing</strong>
              <span>
                Python startup {Math.round(response.loadMs)} ms · execution{' '}
                {Math.round(response.executionMs)} ms
              </span>
            </p>
          </div>
          <ul className="caseResults">
            {response.cases.map((item) => (
              <li key={item.id}>
                <strong>{item.passed ? 'Passed' : 'Failed'}</strong>
                <span>{item.id}</span>
                <code>
                  {item.actual === null ? 'Unsupported result' : JSON.stringify(item.actual)}
                </code>
                {item.mutated && <span>Input was modified</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {response?.output && (
        <details>
          <summary>Captured output</summary>
          <pre className="output">{response.output}</pre>
        </details>
      )}
      {source !== undefined && (
        <details className="submittedSource">
          <summary>Submitted code snapshot</summary>
          <pre className="output">{source}</pre>
        </details>
      )}
    </section>
  );
}
