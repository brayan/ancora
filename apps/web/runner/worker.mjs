import { loadPyodide } from '/runtime/pyodide.mjs';
import {
  MAX_OUTPUT_LENGTH,
  RUNTIME_VERSION,
  casesDigestText,
  digestText,
  isRunRequest,
  jobBinding,
} from '/protocol.mjs';

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
    const [sourceDigest, casesDigest] = await Promise.all([
      digestText(request.source),
      digestText(casesDigestText(request.cases, request.functionContract)),
    ]);
    if (sourceDigest !== request.sourceDigest || casesDigest !== request.casesDigest) {
      self.postMessage({ ...binding, type: 'failure', code: 'invalid_message', output: '' });
      return;
    }

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

    pyodide.runPython(harness);
    const RunnerEvaluation = pyodide.globals.get('RunnerEvaluation');
    const pythonSys = pyodide.pyimport('sys');
    loaded = true;
    self.postMessage({ ...binding, type: 'loaded' });
    const executionStarted = performance.now();
    const cases = pyodide.toPy(request.cases);
    const contract = request.protocolVersion === 2 ? pyodide.toPy(request.functionContract) : null;
    let evaluation;
    let namespace;

    try {
      evaluation = contract
        ? RunnerEvaluation(cases, request.technique, contract)
        : RunnerEvaluation(cases, request.technique);
      let report;
      try {
        namespace = evaluation.prepare(request.source);
        // Source execution belongs to the disposable browser adapter after Python preflight.
        const value = pyodide.runPython(request.source, {
          dedent: false,
          filename: '<solution>',
          globals: namespace,
        });
        if (value instanceof pyodide.ffi.PyProxy) {
          value.destroy();
        }

        evaluation.check(namespace);
        report = JSON.parse(evaluation.report());
      } catch (error) {
        if (!(error instanceof pyodide.ffi.PythonError)) {
          throw error;
        }
        // PythonError.message includes traceback/source. Format only the Python exception.
        const exception = pythonSys.last_exc;
        try {
          report = JSON.parse(evaluation.report(exception));
        } finally {
          exception.destroy();
        }
      }
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
      namespace?.destroy();
      evaluation?.destroy();
      pythonSys.destroy();
      contract?.destroy();
      cases.destroy();
      RunnerEvaluation.destroy();
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
