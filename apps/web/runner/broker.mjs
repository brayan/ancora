import { APP_ORIGIN } from '/config.mjs';
import {
  BOOT_TIMEOUT_MS,
  RUN_TIMEOUT_MS,
  PROTOCOL_VERSION,
  digestText,
  casesDigestText,
  isRunRequest,
  isLoadedResponse,
  jobBinding,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
} from '/protocol.mjs';

let active = null;
let sequence = 0;
const notify = (message) => parent.postMessage(message, APP_ORIGIN);

function finish(response) {
  if (!active) {
    return;
  }

  clearTimeout(active.timer);
  active.worker.terminate();
  active = null;

  notify(response);
}

function fail(code, output = '') {
  if (active) {
    finish({ ...jobBinding(active.request), type: 'failure', code, output });
  }
}

async function start(request) {
  const ticket = ++sequence;
  if (!isRunRequest(request) || active) {
    return;
  }

  const [sourceDigest, casesDigest] = await Promise.all([
    digestText(request.source),
    digestText(casesDigestText(request.cases, request.functionContract)),
  ]);
  if (ticket !== sequence) {
    return;
  }
  if (sourceDigest !== request.sourceDigest || casesDigest !== request.casesDigest) {
    notify({
      ...jobBinding(request),
      type: 'failure',
      code: 'invalid_message',
      output: '',
    });
    return;
  }

  const worker = new Worker('/worker.mjs', {
    type: 'module',
    credentials: 'omit',
  });
  active = {
    request,
    worker,
    loaded: false,
    timer: setTimeout(() => fail('bootstrap_error'), BOOT_TIMEOUT_MS),
  };
  worker.onerror = (event) => {
    event.preventDefault();
    fail('execution_error');
  };
  worker.onmessage = ({ data }) => {
    if (!active || active.worker !== worker) {
      return;
    }

    if (isLoadedResponse(data) && matchesJob(data, request) && !active.loaded) {
      active.loaded = true;
      clearTimeout(active.timer);
      active.timer = setTimeout(() => fail('timeout'), RUN_TIMEOUT_MS);
      notify({ ...jobBinding(request), type: 'loaded' });
      return;
    }

    const response = parseRunnerResponse(data);
    if (!response || !matchesJob(response, request) || !resultsMatchCases(response, request)) {
      fail('invalid_message');
      return;
    }

    finish(response);
  };

  worker.postMessage(request);
}

window.addEventListener('message', ({ source, origin, data }) => {
  if (source !== parent || origin !== APP_ORIGIN) {
    return;
  }

  if (
    data?.type === 'connect' &&
    data.protocolVersion === PROTOCOL_VERSION &&
    Object.keys(data).length === 2
  ) {
    notify({ type: 'connected', protocolVersion: PROTOCOL_VERSION });
  } else if (data?.type === 'run') {
    void start(data).catch(() => {
      if (active) {
        fail('bootstrap_error');
      } else if (isRunRequest(data)) {
        notify({
          ...jobBinding(data),
          type: 'failure',
          code: 'bootstrap_error',
          output: '',
        });
      }
    });
  } else if (
    data?.type === 'stop' &&
    typeof data.jobId === 'string' &&
    Object.keys(data).length === 2
  ) {
    ++sequence;
    if (active?.request.jobId === data.jobId) {
      fail('stopped');
    }
  }
});
