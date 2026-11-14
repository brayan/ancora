'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attemptSchema, draftSchema, envelopeSchema, sessionSchema } from '@ancora/schemas';
import type { PracticeDraft, PracticeSession, RunEnvelope } from '@ancora/shared-types';
import type { RunnerResponse } from '@/runner/protocol.mjs';
import {
  readPendingReport,
  writePendingReport,
  removePendingReport,
} from '@/features/programming-practice/recovery';

type SaveState = 'loading' | 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';
type Recovery = { source: string; version: number };
const recoveryKey = (revisionId: string) => `ancora:draft:v1:${revisionId}`;

async function jsonRequest(url: string, method = 'GET', value?: unknown) {
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers: value === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  const data: unknown = await response.json();
  return { response, data };
}

export function usePracticeSession() {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [source, setSource] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [recoveryAvailable, setRecoveryAvailable] = useState(true);
  const [reportSaving, setReportSaving] = useState(false);
  const [message, setMessage] = useState('Opening your saved practice…');
  const [conflict, setConflict] = useState<PracticeDraft | null>(null);
  const [pendingReport, setPendingReport] = useState<{ id: string; report: RunnerResponse } | null>(
    null
  );
  const current = useRef({ revisionId: '', source: '', savedSource: '', version: 0 });
  const blocked = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(false);

  const recover = useCallback(() => {
    const value = current.current;
    try {
      if (value.source === value.savedSource) {
        sessionStorage.removeItem(recoveryKey(value.revisionId));
      } else {
        sessionStorage.setItem(
          recoveryKey(value.revisionId),
          JSON.stringify({
            source: value.source,
            version: value.version,
          })
        );
      }
      return true;
    } catch {
      setRecoveryAvailable(false);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    const { response, data } = await jsonRequest('/api/practice/session');
    if (!response.ok) {
      throw new Error('practice_unavailable');
    }
    return sessionSchema.parse(data);
  }, []);

  const applySession = useCallback(
    (saved: PracticeSession) => {
      if (!mounted.current) {
        return;
      }
      const draft = saved.draft;
      let recovery: Recovery | null = null;
      try {
        const raw = sessionStorage.getItem(recoveryKey(draft.revisionId));
        const parsed = raw
          ? draftSchema.omit({ revisionId: true }).safeParse(JSON.parse(raw))
          : null;
        recovery = parsed?.success ? parsed.data : null;
      } catch {
        // A malformed local recovery entry must not replace the durable draft.
      }

      const localSource = recovery?.source ?? draft.source;
      const hasConflict =
        recovery !== null && recovery.source !== draft.source && recovery.version !== draft.version;
      current.current = {
        revisionId: draft.revisionId,
        source: localSource,
        savedSource: draft.source,
        version: recovery && hasConflict ? recovery.version : draft.version,
      };

      setSession(saved);
      setSource(localSource);
      setPendingReport(readPendingReport(draft.revisionId));
      blocked.current = hasConflict;
      setConflict(blocked.current ? draft : null);
      setSaveState(
        blocked.current ? 'conflict' : localSource === draft.source ? 'saved' : 'unsaved'
      );
      setMessage(
        blocked.current
          ? 'Another tab saved a different draft. Choose which version to keep.'
          : localSource === draft.source
            ? 'Draft saved to your local database.'
            : 'Recovered edits. Saving your draft…'
      );
      recover();
    },
    [recover]
  );

  const failOpening = useCallback(() => {
    if (mounted.current) {
      setSaveState('error');
      setMessage('Practice could not open. Check PostgreSQL and run the migrations, then retry.');
    }
  }, []);

  const open = useCallback(
    () => refresh().then(applySession).catch(failOpening),
    [refresh, applySession, failOpening]
  );

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void refresh()
      .then((saved) => {
        if (active) {
          applySession(saved);
        }
      })
      .catch(() => {
        if (active) {
          failOpening();
        }
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [refresh, applySession, failOpening]);

  const edit = useCallback(
    (value: string) => {
      current.current.source = value;
      setSource(value);
      recover();
      if (!blocked.current) {
        setSaveState('unsaved');
        setMessage('Unsaved changes. A recovery copy is kept in this browser.');
      }
    },
    [recover]
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (blocked.current || !current.current.revisionId) {
      return false;
    }
    if (inFlight.current) {
      const previous = await inFlight.current;
      return previous && current.current.source === current.current.savedSource;
    }

    const task = (async () => {
      while (current.current.source !== current.current.savedSource) {
        const snapshot = { ...current.current };
        setSaveState('saving');
        setMessage('Saving draft…');
        try {
          const { response, data } = await jsonRequest('/api/practice/draft', 'PUT', {
            apiVersion: 1,
            revisionId: snapshot.revisionId,
            source: snapshot.source,
            version: snapshot.version,
          });
          if (response.status === 409 && data && typeof data === 'object' && 'draft' in data) {
            const remote = draftSchema.parse(data.draft);
            blocked.current = true;
            setConflict(remote);
            setSaveState('conflict');
            setMessage('Another tab saved a different draft. Your edits are still here.');
            return false;
          }
          if (!response.ok) {
            throw new Error('save_failed');
          }
          const saved = draftSchema.parse(data);
          current.current.version = saved.version;
          current.current.savedSource = saved.source;
          recover();
        } catch {
          setSaveState('error');
          setMessage('Draft could not be saved. Your edits are still here. Retry before leaving.');
          return false;
        }
      }

      setSaveState('saved');
      setMessage('Draft saved to your local database.');
      return true;
    })();
    inFlight.current = task;
    try {
      return await task;
    } finally {
      inFlight.current = null;
    }
  }, [recover]);

  useEffect(() => {
    if (saveState !== 'unsaved') {
      return;
    }
    const timer = setTimeout(() => {
      void save();
    }, 500);
    return () => clearTimeout(timer);
  }, [source, saveState, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (current.current.source !== current.current.savedSource) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const chooseDraft = (keepLocal: boolean) => {
    if (!conflict) {
      return;
    }
    current.current.version = conflict.version;
    current.current.savedSource = conflict.source;
    if (!keepLocal) {
      current.current.source = conflict.source;
      setSource(conflict.source);
    }
    blocked.current = false;
    setConflict(null);
    setSaveState(keepLocal ? 'unsaved' : 'saved');
    setMessage(keepLocal ? 'Saving your chosen draft…' : 'Opened the database draft.');
    recover();
  };

  const prepare = async (
    mode: 'examples' | 'check',
    submissionId: string
  ): Promise<RunEnvelope> => {
    if (!(await save())) {
      throw new Error('draft_not_saved');
    }
    const snapshot = { ...current.current };
    const { response, data } = await jsonRequest('/api/practice/attempts', 'POST', {
      apiVersion: 1,
      revisionId: snapshot.revisionId,
      submissionId,
      source: snapshot.source,
      mode,
    });
    if (!response.ok) {
      throw new Error('attempt_not_saved');
    }
    const envelope = envelopeSchema.parse(data);
    setSession(await refresh());
    return envelope;
  };

  const persistReport = async (id: string, report: RunnerResponse) => {
    setPendingReport({ id, report });
    setReportSaving(true);
    if (!writePendingReport({ id, report })) {
      setRecoveryAvailable(false);
    }
    try {
      const { response } = await jsonRequest(`/api/practice/attempts/${id}/result`, 'POST', {
        apiVersion: 1,
        report,
      });
      if (!response.ok) {
        throw new Error('report_not_saved');
      }
      removePendingReport(id);
      setPendingReport(readPendingReport(current.current.revisionId));
      setSession(await refresh());
    } finally {
      setReportSaving(false);
    }
  };

  const viewAttempt = async (id: string) => {
    const { response, data } = await jsonRequest(`/api/practice/attempts/${id}`);
    if (!response.ok) {
      throw new Error('attempt_unavailable');
    }
    return attemptSchema.parse(data);
  };

  const reference = async () => {
    const { response, data } = await jsonRequest('/api/practice/reference', 'POST', {
      apiVersion: 1,
      revisionId: current.current.revisionId,
    });
    if (!response.ok) {
      throw new Error('reference_unavailable');
    }
    return envelopeSchema.parse(data);
  };

  return {
    session,
    source,
    edit,
    saveState,
    message,
    conflict,
    chooseDraft,
    save,
    open: () => {
      setSaveState('loading');
      void open();
    },
    prepare,
    persistReport,
    pendingReport,
    reportSaving,
    recoveryAvailable,
    refresh,
    reference,
    viewAttempt,
  };
}
