'use client';

import { useEffect, useRef, useState } from 'react';
import {
  envelopeSchema,
  generationStatusSchema,
  generationViewSchema,
  startGenerationSchema,
  type GenerationRequest,
  type GenerationView,
} from '@ancora/schemas';
import {
  isRunRequest,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
  type RunRequest,
  type RunnerResponse,
} from '@/runner/protocol.mjs';

type StartRequest = { apiVersion: 1; id: string; request: GenerationRequest };
type PendingValidation = { revisionId: string; report: RunnerResponse };
type GenerationActions = {
  onGenerateSave: () => Promise<boolean>;
  run: (request: RunRequest) => Promise<RunnerResponse | null>;
  onBusyChange: (busy: boolean) => void;
};
const requestKey = 'ancora:generation-request:v1';
const selectionKey = 'ancora:generation-selection:v1';
const reportKey = (id: string) => `ancora:generation-validation:v1:${id}`;

async function requestJson(url: string, value?: unknown) {
  const response = await fetch(url, {
    method: value === undefined ? 'GET' : 'POST',
    cache: 'no-store',
    headers: value === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error('generation_unavailable');
  }
  const data: unknown = await response.json();
  return data;
}

function readValidation(id: string, revisionId: string | null): PendingValidation | null {
  try {
    const raw = sessionStorage.getItem(reportKey(id));
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === 'object' && 'revisionId' in value && 'report' in value) {
      const report = parseRunnerResponse(value.report);
      if (
        typeof value.revisionId === 'string' &&
        value.revisionId === revisionId &&
        report?.revisionId === value.revisionId
      ) {
        return { revisionId: value.revisionId, report };
      }
    }
  } catch {
    // A damaged recovery entry must not replace a durable validation job.
  }
  return null;
}

export function useGeneration({ onGenerateSave, run, onBusyChange }: GenerationActions) {
  const [generation, setGeneration] = useState<GenerationView | null>(null);
  const [available, setAvailable] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Opening challenge generation…');
  const [error, setError] = useState('');
  const [pendingStart, setPendingStart] = useState<StartRequest | null>(null);
  const [pendingReport, setPendingReport] = useState<PendingValidation | null>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState(true);
  const locked = useRef(false);
  const mounted = useRef(false);

  const store = (key: string, value: unknown | null) => {
    try {
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      setRecoveryAvailable(false);
    }
  };

  const apply = (saved: GenerationView) => {
    store(selectionKey, saved.id);
    setGeneration(saved);
    setPendingReport(
      saved.state === 'validating' ? readValidation(saved.id, saved.revisionId) : null
    );
  };

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const open = async () => {
      let pending: StartRequest | null = null;
      let selectedId: string | null = null;
      try {
        const raw = sessionStorage.getItem(requestKey);
        const parsed = raw ? startGenerationSchema.safeParse(JSON.parse(raw)) : null;
        pending = parsed?.success ? parsed.data : null;
        const selected = sessionStorage.getItem(selectionKey);
        const selectedResult = selected
          ? generationViewSchema.shape.id.safeParse(JSON.parse(selected))
          : null;
        selectedId = selectedResult?.success ? selectedResult.data : null;
      } catch {
        // Invalid browser state cannot authorize a provider call.
      }
      try {
        const status = generationStatusSchema.parse(await requestJson('/api/practice/generations'));
        let saved = status.generation;
        const savedId = pending?.id ?? selectedId;
        if (savedId) {
          try {
            saved = generationViewSchema.parse(
              await requestJson(`/api/practice/generations/${savedId}`)
            );
            pending = null;
          } catch {
            if (!pending) {
              throw new Error('saved_generation_unavailable');
            }
            // An uncertain POST is retried only by explicit action, with its original ID.
          }
        }
        if (!active) {
          return;
        }
        setAvailable(status.available);
        setModel(status.model);
        setGeneration(saved);
        setPendingStart(pending);
        setPendingReport(
          saved?.state === 'validating' ? readValidation(saved.id, saved.revisionId) : null
        );
        setMessage('');
        if (!pending) {
          try {
            sessionStorage.removeItem(requestKey);
            if (saved) {
              sessionStorage.setItem(selectionKey, JSON.stringify(saved.id));
            }
          } catch {
            setRecoveryAvailable(false);
          }
        }
      } catch {
        if (active) {
          setPendingStart(pending);
          setError('Generation could not open. Your current challenge and draft are preserved.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void open();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  const action = async (label: string, operation: () => Promise<void>) => {
    if (locked.current) {
      return;
    }
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage(label);
    setError('');
    try {
      await operation();
      if (mounted.current) {
        setMessage('');
      }
    } catch {
      if (mounted.current) {
        setError('The action could not finish. Your current challenge and draft are preserved.');
        setMessage('');
      }
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  };

  const persistValidation = async (saved: GenerationView, pending: PendingValidation) => {
    setPendingReport(pending);
    store(reportKey(saved.id), pending);
    const updated = generationViewSchema.parse(
      await requestJson(`/api/practice/generations/${saved.id}/validation`, {
        apiVersion: 1,
        revisionId: pending.revisionId,
        report: pending.report,
      })
    );
    store(reportKey(saved.id), null);
    setPendingReport(null);
    setGeneration(updated);
  };

  const validate = async (saved: GenerationView) => {
    const envelope = envelopeSchema.parse(
      await requestJson(`/api/practice/generations/${saved.id}/validation`)
    );
    if (
      !isRunRequest(envelope.request) ||
      envelope.attemptId !== null ||
      envelope.request.revisionId !== saved.revisionId
    ) {
      throw new Error('validation_job_mismatch');
    }
    const recovered = pendingReport ?? readValidation(saved.id, saved.revisionId);
    const report =
      (recovered && matchesJob(recovered.report, envelope.request)
        ? recovered.report
        : parseRunnerResponse(envelope.report)) ?? (await run(envelope.request));
    if (
      !report ||
      !matchesJob(report, envelope.request) ||
      !resultsMatchCases(report, envelope.request)
    ) {
      throw new Error('validation_interrupted');
    }
    await persistValidation(saved, { revisionId: envelope.request.revisionId, report });
  };

  const start = (request: GenerationRequest) =>
    action('Generating a new challenge…', async () => {
      if (!(await onGenerateSave())) {
        throw new Error('draft_not_saved');
      }
      const submitted =
        pendingStart ??
        startGenerationSchema.parse({
          apiVersion: 1,
          id: crypto.randomUUID(),
          request,
        });
      setPendingStart(submitted);
      store(requestKey, submitted);
      const saved = generationViewSchema.parse(
        await requestJson('/api/practice/generations', submitted)
      );
      store(requestKey, null);
      setPendingStart(null);
      apply(saved);
      if (saved.state === 'validating') {
        setMessage('Checking the reference in the isolated runner…');
        await validate(saved);
      }
    });

  const refresh = () =>
    action('Checking generation status…', async () => {
      const status = generationStatusSchema.parse(await requestJson('/api/practice/generations'));
      setAvailable(status.available);
      setModel(status.model);
      const savedId = pendingStart?.id ?? generation?.id;
      const saved = savedId
        ? generationViewSchema.parse(await requestJson(`/api/practice/generations/${savedId}`))
        : status.generation;
      if (saved) {
        apply(saved);
        if (saved.id === pendingStart?.id) {
          store(requestKey, null);
          setPendingStart(null);
        }
      }
    });

  const correct = () =>
    action('Requesting one correction…', async () => {
      if (!generation || generation.dispatches !== 1) {
        return;
      }
      const saved = generationViewSchema.parse(
        await requestJson(`/api/practice/generations/${generation.id}/correction`, {
          apiVersion: 1,
        })
      );
      apply(saved);
      if (saved.state === 'validating') {
        setMessage('Checking the corrected reference in the isolated runner…');
        await validate(saved);
      }
    });

  const resume = () =>
    action('Checking the reference in the isolated runner…', async () => {
      if (generation) {
        await validate(generation);
      }
    });

  const retryReport = () =>
    action('Saving the validation result…', async () => {
      if (generation && pendingReport) {
        await persistValidation(generation, pendingReport);
      }
    });

  return {
    generation,
    available,
    model,
    loading,
    busy,
    message,
    error,
    pendingStart,
    pendingReport,
    recoveryAvailable,
    start,
    refresh,
    correct,
    resume,
    retryReport,
  };
}
