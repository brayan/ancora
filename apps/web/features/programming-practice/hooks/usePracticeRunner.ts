"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BOOT_TIMEOUT_MS,
  PROTOCOL_VERSION,
  RUNTIME_VERSION,
  RUN_TIMEOUT_MS,
  digestText,
  jobBinding,
  isLoadedResponse,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
  type RunRequest,
} from "@/runner/protocol.mjs";
import {
  CHALLENGE_REVISION,
  RUNNER_ORIGIN,
} from "@/features/programming-practice/constants";
import type { RunnerState } from "@/features/programming-practice/types";
import type { RunnerCase } from "@/runner/protocol.mjs";

type CurrentRun = {
  id: string;
  request: RunRequest | null;
  watchdog: ReturnType<typeof setTimeout> | null;
};

export function usePracticeRunner(
  frameRef: RefObject<HTMLIFrameElement | null>,
) {
  const activeRun = useRef<CurrentRun | null>(null);
  const connected = useRef(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [state, setState] = useState<RunnerState>({
    status: "connecting",
    response: null,
    label: "Connecting to the local runner…",
  });

  useEffect(() => {
    const frame = frameRef.current;
    const connectionTimer = setTimeout(() => {
      if (!connected.current)
        setState({
          status: "unavailable",
          response: null,
          label: "Runner unavailable. Start pnpm dev, then reconnect.",
        });
    }, 4_000);
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== RUNNER_ORIGIN ||
        event.source !== frame?.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      const message = event.data as Record<string, unknown>;
      if (
        message.type === "connected" &&
        message.protocolVersion === PROTOCOL_VERSION &&
        Object.keys(message).length === 2 &&
        !activeRun.current
      ) {
        connected.current = true;
        clearTimeout(connectionTimer);
        setState({
          status: "ready",
          response: null,
          label: "Ready. Python runs locally in your browser.",
        });
        return;
      }
      const run = activeRun.current;
      if (!run?.request) return;
      if (isLoadedResponse(message) && matchesJob(message, run.request)) {
        setState({
          status: "running",
          response: null,
          label: "Running your function…",
        });
        return;
      }
      const response = parseRunnerResponse(message);
      if (
        !response ||
        !matchesJob(response, run.request) ||
        !resultsMatchCases(response, run.request)
      )
        return;
      if (run.watchdog) clearTimeout(run.watchdog);
      activeRun.current = null;
      setState({
        status: "finished",
        response,
        label:
          response.type === "result"
            ? "Run complete."
            : "Run ended. Your code is still in the editor.",
      });
    };
    window.addEventListener("message", receive);
    // The iframe can finish loading before React installs this listener.
    frame?.contentWindow?.postMessage(
      { type: "connect", protocolVersion: PROTOCOL_VERSION },
      RUNNER_ORIGIN,
    );
    return () => {
      clearTimeout(connectionTimer);
      window.removeEventListener("message", receive);
      const run = activeRun.current;
      if (run?.watchdog) clearTimeout(run.watchdog);
      if (run)
        frame?.contentWindow?.postMessage(
          { type: "stop", jobId: run.id },
          RUNNER_ORIGIN,
        );
      activeRun.current = null;
    };
  }, [frameVersion, frameRef]);

  const connect = () =>
    frameRef.current?.contentWindow?.postMessage(
      { type: "connect", protocolVersion: PROTOCOL_VERSION },
      RUNNER_ORIGIN,
    );
  const reconnect = () => {
    connected.current = false;
    setState({
      status: "connecting",
      response: null,
      label: "Connecting to the local runner…",
    });
    setFrameVersion((version) => version + 1);
  };
  const stop = () => {
    const run = activeRun.current;
    if (!run) return;
    if (run.watchdog) clearTimeout(run.watchdog);
    frameRef.current?.contentWindow?.postMessage(
      { type: "stop", jobId: run.id },
      RUNNER_ORIGIN,
    );
    activeRun.current = null;
    setState({
      status: "finished",
      response: run.request
        ? {
            ...jobBinding(run.request),
            type: "failure",
            code: "stopped",
            output: "",
          }
        : null,
      label: "Stopped. You can run again.",
    });
  };
  const run = async (source: string, cases: RunnerCase[]) => {
    if (!connected.current || activeRun.current) return;
    const id = crypto.randomUUID();
    const pending: CurrentRun = { id, request: null, watchdog: null };
    activeRun.current = pending;
    setState({
      status: "preparing",
      response: null,
      label: "Preparing this run…",
    });
    try {
      const [sourceDigest, casesDigest] = await Promise.all([
        digestText(source),
        digestText(JSON.stringify(cases)),
      ]);
      if (activeRun.current !== pending) return;
      const request: RunRequest = {
        type: "run",
        protocolVersion: PROTOCOL_VERSION,
        jobId: id,
        revisionId: CHALLENGE_REVISION,
        sourceDigest,
        casesDigest,
        runtimeVersion: RUNTIME_VERSION,
        source,
        cases,
        functionName: "positive_even",
        technique: "list_comprehension",
      };
      pending.request = request;
      pending.watchdog = setTimeout(
        () => {
          if (activeRun.current !== pending) return;
          frameRef.current?.contentWindow?.postMessage(
            { type: "stop", jobId: id },
            RUNNER_ORIGIN,
          );
          activeRun.current = null;
          connected.current = false;
          setState({
            status: "unavailable",
            response: null,
            label:
              "Runner did not respond. Reconnect to start a fresh context.",
          });
        },
        BOOT_TIMEOUT_MS + RUN_TIMEOUT_MS + 2_000,
      );
      setState({
        status: "loading",
        response: null,
        label: "Starting a fresh Python runtime…",
      });
      frameRef.current?.contentWindow?.postMessage(request, RUNNER_ORIGIN);
    } catch {
      activeRun.current = null;
      setState({
        status: "unavailable",
        response: null,
        label: "Could not prepare the run. Reconnect and try again.",
      });
    }
  };

  return {
    frameVersion,
    state,
    connect,
    reconnect,
    run,
    stop,
    busy: ["preparing", "loading", "running"].includes(state.status),
  };
}
