'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  BOOT_TIMEOUT_MS,
  PROTOCOL_VERSION,
  RUN_TIMEOUT_MS,
  isRunRequest,
  jobBinding,
  isLoadedResponse,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
  type RunRequest,
  type RunnerResponse,
} from '@/runner/protocol.mjs';
import { RUNNER_ORIGIN } from '@/features/programming-practice/constants';
import type { RunnerState } from '@/features/programming-practice/types';

type CurrentRun = {
  request: RunRequest;
  watchdog: ReturnType<typeof setTimeout>;
  resolve: (response: RunnerResponse | null) => void;
};

export function usePracticeRunner(frameRef: RefObject<HTMLIFrameElement | null>) {
  const activeRun = useRef<CurrentRun | null>(null);
  const connected = useRef(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [state, setState] = useState<RunnerState>({
    status: 'connecting',
    response: null,
    label: 'Connecting to the local runner…',
  });

  const finish = (response: RunnerResponse) => {
    const active = activeRun.current;
    if (!active) {
      return;
    }
    clearTimeout(active.watchdog);
    activeRun.current = null;
    setState({
      status: 'finished',
      response,
      label: response.type === 'result' ? 'Run complete.' : 'Run ended. Your draft is preserved.',
    });
    active.resolve(response);
  };

  useEffect(() => {
    const frame = frameRef.current;
    const timer = setTimeout(() => {
      if (!connected.current) {
        setState({
          status: 'unavailable',
          response: null,
          label: 'Runner unavailable. Start pnpm dev, then reconnect.',
        });
      }
    }, 4_000);

    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== RUNNER_ORIGIN ||
        event.source !== frame?.contentWindow ||
        !event.data ||
        typeof event.data !== 'object'
      ) {
        return;
      }
      const message = event.data as Record<string, unknown>;
      if (
        message.type === 'connected' &&
        message.protocolVersion === PROTOCOL_VERSION &&
        Object.keys(message).length === 2 &&
        !activeRun.current
      ) {
        connected.current = true;
        clearTimeout(timer);
        setState({
          status: 'ready',
          response: null,
          label: 'Ready. Python runs locally in your browser.',
        });
        return;
      }

      const active = activeRun.current;
      if (!active) {
        return;
      }
      if (isLoadedResponse(message) && matchesJob(message, active.request)) {
        setState({ status: 'running', response: null, label: 'Running your function…' });
        return;
      }
      const response = parseRunnerResponse(message);
      if (
        response &&
        matchesJob(response, active.request) &&
        resultsMatchCases(response, active.request)
      ) {
        finish(response);
      }
    };

    window.addEventListener('message', receive);
    frame?.contentWindow?.postMessage(
      { type: 'connect', protocolVersion: PROTOCOL_VERSION },
      RUNNER_ORIGIN
    );
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      const active = activeRun.current;
      if (active) {
        clearTimeout(active.watchdog);
        frame?.contentWindow?.postMessage(
          { type: 'stop', jobId: active.request.jobId },
          RUNNER_ORIGIN
        );
        activeRun.current = null;
        active.resolve(null);
      }
    };
  }, [frameVersion, frameRef]);

  const connect = () =>
    frameRef.current?.contentWindow?.postMessage(
      { type: 'connect', protocolVersion: PROTOCOL_VERSION },
      RUNNER_ORIGIN
    );

  const reconnect = () => {
    connected.current = false;
    setState({ status: 'connecting', response: null, label: 'Connecting to the local runner…' });
    setFrameVersion((version) => version + 1);
  };

  const stop = () => {
    const active = activeRun.current;
    if (!active) {
      return;
    }
    frameRef.current?.contentWindow?.postMessage(
      { type: 'stop', jobId: active.request.jobId },
      RUNNER_ORIGIN
    );
    finish({ ...jobBinding(active.request), type: 'failure', code: 'stopped', output: '' });
  };

  const run = (request: RunRequest): Promise<RunnerResponse | null> => {
    if (!connected.current || activeRun.current || !isRunRequest(request)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const watchdog = setTimeout(
        () => {
          if (activeRun.current?.request !== request) {
            return;
          }
          frameRef.current?.contentWindow?.postMessage(
            { type: 'stop', jobId: request.jobId },
            RUNNER_ORIGIN
          );
          finish({ ...jobBinding(request), type: 'failure', code: 'bootstrap_error', output: '' });
          connected.current = false;
          setState({
            status: 'unavailable',
            response: null,
            label: 'Runner did not respond. Reconnect to start a fresh context.',
          });
        },
        BOOT_TIMEOUT_MS + RUN_TIMEOUT_MS + 2_000
      );
      activeRun.current = { request, watchdog, resolve };
      setState({ status: 'loading', response: null, label: 'Starting a fresh Python runtime…' });
      frameRef.current?.contentWindow?.postMessage(request, RUNNER_ORIGIN);
    });
  };

  return {
    frameVersion,
    state,
    connect,
    reconnect,
    run,
    stop,
    busy: ['preparing', 'loading', 'running'].includes(state.status),
  };
}
