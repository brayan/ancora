import { loadPyodide } from '/runtime/pyodide.mjs';
import { MAX_OUTPUT_LENGTH, RUNTIME_VERSION, isRunRequest, jobBinding } from '/protocol.mjs';

self.onmessage = async ({ data: request }) => {
  if (!isRunRequest(request)) {
    return;
  }

  self.onmessage = null;
  const binding = jobBinding(request);
  const started = performance.now();
  let output = '';
  let outputLimited = false;
  let loaded = false;

  try {
    const [pyodide, harness] = await Promise.all([
      loadPyodide({
        indexURL: '/runtime/',
        stdout: () => {},
        stderr: () => {},
      }),
      fetch('/harness.py', { credentials: 'omit' }).then((response) => response.text()),
    ]);
    if (pyodide.version !== RUNTIME_VERSION) {
      throw new Error('Unexpected runtime version');
    }

    const loadMs = performance.now() - started;
    const decoder = new TextDecoder();
    const write = (buffer) => {
      const text = decoder.decode(buffer);
      output = (output + text).slice(0, MAX_OUTPUT_LENGTH);
      if (!outputLimited && output.length >= MAX_OUTPUT_LENGTH) {
        outputLimited = true;
        self.postMessage({
          ...binding,
          type: 'failure',
          code: 'output_limit',
          output,
        });
      }
      return buffer.length;
    };

    pyodide.setStdout({ write });
    pyodide.setStderr({ write });
    pyodide.setStdin({ error: true });

    const evaluate = pyodide.runPython(harness);
    loaded = true;
    self.postMessage({ ...binding, type: 'loaded' });
    const executionStarted = performance.now();
    const cases = pyodide.toPy(request.cases);

    try {
      const report = JSON.parse(evaluate(request.source, cases, request.technique));
      if (!outputLimited) {
        self.postMessage({
          ...binding,
          type: 'result',
          ...report,
          output,
          loadMs,
          executionMs: performance.now() - executionStarted,
        });
      }
    } finally {
      cases.destroy();
      evaluate.destroy();
    }
  } catch {
    self.postMessage({
      ...binding,
      type: 'failure',
      code: loaded ? 'execution_error' : 'bootstrap_error',
      output: '',
    });
  }
};
