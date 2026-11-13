"use client";

import { useRef, useState } from "react";
import { StatusBadge } from "@ancora/ui";
import { MAX_SOURCE_LENGTH } from "@/runner/protocol.mjs";
import {
  CHECK_CASES,
  PUBLIC_CASES,
  REFERENCE_CODE,
  RUNNER_ORIGIN,
  STARTER_CODE,
} from "@/features/programming-practice/constants";
import { usePracticeRunner } from "@/features/programming-practice/hooks/usePracticeRunner";

const failureMessages = {
  bootstrap_error:
    "Python could not start. Check the local runner and try again.",
  execution_error: "The execution context failed. Try a fresh run.",
  timeout:
    "Time limit reached (2 seconds). Check for an infinite loop and run again.",
  stopped:
    "Execution stopped. The next run starts with a fresh Python runtime.",
  output_limit:
    "Output limit reached (8,000 characters). Reduce printing and run again.",
  invalid_message: "The runner returned an invalid report. Start a fresh run.",
};

export function PracticeScreen() {
  const [source, setSource] = useState(STARTER_CODE);
  const [resultSource, setResultSource] = useState("Your solution");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runner = usePracticeRunner(frameRef);
  const response = runner.state.response;
  const available = !["connecting", "unavailable"].includes(
    runner.state.status,
  );
  const validSource =
    source.trim().length > 0 && source.length <= MAX_SOURCE_LENGTH;
  const passed =
    response?.type === "result"
      ? response.cases.filter((item) => item.passed).length
      : 0;

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
      <div className="practiceIntro">
        <h1>Keep the positive evens</h1>
        <p>Practise filtering with a list comprehension.</p>
      </div>
      <div className="practiceWorkspace">
        <section className="challengePanel" aria-labelledby="challenge-heading">
          <h2 id="challenge-heading">The challenge</h2>
          <p>
            Write a function that returns a new list containing only the
            positive, even integers from <code>values</code>.
          </p>
          <pre className="signature">
            <code>positive_even(values: list[int]) → list[int]</code>
          </pre>
          <ul className="requirements">
            <li>Construct the result with a list comprehension.</li>
            <li>Keep the original order and duplicates.</li>
            <li>Leave the input list unchanged.</li>
            <li>
              Zero is not positive. Inputs are valid integers, excluding
              booleans.
            </li>
          </ul>
          <h3>Examples</h3>
          <div className="examples">
            {PUBLIC_CASES.map((example) => (
              <div key={example.id}>
                <code>{JSON.stringify(example.input)}</code>
                <span>
                  returns <code>{JSON.stringify(example.expected)}</code>
                </span>
              </div>
            ))}
          </div>
          <p className="scopeNote">
            Synthetic exercise for the runner spike. Challenge generation, saved
            drafts and history come next.
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
            value={source}
            onChange={(event) => setSource(event.target.value)}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            maxLength={MAX_SOURCE_LENGTH}
            aria-describedby="editor-note"
          />
          <p id="editor-note" className="editorNote">
            Code stays in this browser. This spike does not save drafts; copy
            your work before leaving.
          </p>
          <div className="runActions">
            <button
              type="button"
              className="button primary"
              disabled={!available || runner.busy || !validSource}
              onClick={() => {
                setResultSource("Your solution");
                void runner.run(source, PUBLIC_CASES);
              }}
            >
              Run examples
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={!available || runner.busy || !validSource}
              onClick={() => {
                setResultSource("Your solution");
                void runner.run(source, CHECK_CASES);
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
          <p className="runnerStatus" role="status" aria-live="polite">
            {runner.state.label}
          </p>
          {runner.state.status === "unavailable" && (
            <button
              type="button"
              className="button secondary"
              onClick={runner.reconnect}
            >
              Reconnect runner
            </button>
          )}
        </section>
      </div>
      <section className="resultsPanel" aria-labelledby="results-heading">
        <div className="panelHeader">
          <h2 id="results-heading">
            Results{response ? ` · ${resultSource}` : ""}
          </h2>
          <span>Behavior and technique are checked separately</span>
        </div>
        {!response && (
          <p className="emptyResults">
            Run the examples to see what your function returns.
          </p>
        )}
        {response?.type === "failure" && (
          <p className="executionError" role="alert">
            {failureMessages[response.code]}
          </p>
        )}
        {response?.type === "result" && (
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
                  {passed}/{response.cases.length} cases passed
                  {response.error ? " before error" : ""}
                </span>
              </p>
              <p>
                <strong>Technique</strong>
                <span>
                  {response.technique === "passed"
                    ? "List comprehension verified"
                    : response.technique === "failed"
                      ? "List comprehension required"
                      : "Inconclusive — unsupported code pattern"}
                </span>
              </p>
              <p>
                <strong>Timing</strong>
                <span>
                  Python startup {Math.round(response.loadMs)} ms · execution{" "}
                  {Math.round(response.executionMs)} ms
                </span>
              </p>
            </div>
            <ul className="caseResults">
              {response.cases.map((item) => (
                <li key={item.id}>
                  <strong>{item.passed ? "Passed" : "Failed"}</strong>
                  <span>{item.id}</span>
                  <code>
                    {item.actual === null
                      ? "Unsupported result"
                      : JSON.stringify(item.actual)}
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
      </section>
      <details className="spikeTools">
        <summary>Runner spike tools and limits</summary>
        <p>
          Each run uses a disposable worker on a separate origin. Results are
          local self-study evidence. The browser has no hard memory quota.
        </p>
        <div className="runActions">
          <button
            type="button"
            className="button secondary"
            disabled={runner.busy}
            onClick={() => setSource(REFERENCE_CODE)}
          >
            Load reference solution
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={runner.busy || !available}
            onClick={() => {
              setResultSource("Reference solution");
              void runner.run(REFERENCE_CODE, CHECK_CASES);
            }}
          >
            Run reference separately
          </button>
        </div>
      </details>
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
