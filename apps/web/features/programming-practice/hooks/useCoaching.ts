'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  attemptSchema,
  coachingStatusSchema,
  coachingViewSchema,
  type CoachingStatus,
  type PracticeAttempt,
} from '@ancora/schemas';

export function useCoaching(attemptId: string, onBusyChange: (busy: boolean) => void) {
  const [saved, setSaved] = useState<CoachingStatus | null>(null);
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mounted = useRef(false);
  const sequence = useRef(0);

  const refresh = useCallback(() => {
    const request = ++sequence.current;
    const read = async () => {
      const responses = await Promise.all([
        fetch(`/api/practice/coaching?attemptId=${encodeURIComponent(attemptId)}`, {
          cache: 'no-store',
        }),
        fetch(`/api/practice/attempts/${encodeURIComponent(attemptId)}`, { cache: 'no-store' }),
      ]);
      if (responses.some((response) => !response.ok)) {
        throw new Error('coaching_unavailable');
      }
      const snapshot = coachingStatusSchema.parse(await responses[0].json());
      const selected = attemptSchema.parse(await responses[1].json());
      if (
        selected.id !== attemptId ||
        (snapshot.coaching && snapshot.coaching.attemptId !== attemptId)
      ) {
        throw new Error('attempt_mismatch');
      }
      return { snapshot, selected };
    };
    return read()
      .then(({ snapshot, selected }) => {
        if (mounted.current && request === sequence.current) {
          setSaved(snapshot);
          setAttempt(selected);
          setError('');
        }
        return snapshot;
      })
      .catch(() => {
        if (mounted.current && request === sequence.current) {
          setError(
            'Saved coaching could not open. Your draft is preserved. Refresh coaching to retry.'
          );
        }
        return null;
      })
      .finally(() => {
        if (mounted.current && request === sequence.current) {
          setLoading(false);
        }
      });
  }, [attemptId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh, attemptId]);

  const generating = saved?.coaching?.state === 'generating';
  useEffect(() => {
    if (!generating) {
      return;
    }
    const timer = setInterval(() => {
      void refresh();
    }, 2_000);
    return () => clearInterval(timer);
  }, [generating, refresh]);

  const request = async () => {
    if (!attempt || attempt.id !== attemptId) {
      return;
    }
    setActing(true);
    setMessage('');
    onBusyChange(true);
    try {
      const retryId = saved?.coaching?.id;
      const response = await fetch(
        retryId ? `/api/practice/coaching/${retryId}/retry` : '/api/practice/coaching',
        {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            retryId
              ? { apiVersion: 1, shareCode: true }
              : { apiVersion: 1, id: crypto.randomUUID(), attemptId, shareCode: true }
          ),
        }
      );
      if (!response.ok) {
        throw new Error('coaching_unconfirmed');
      }
      const result = coachingViewSchema.parse(await response.json());
      if (result.attemptId !== attemptId) {
        throw new Error('attempt_mismatch');
      }
    } catch {
      if (mounted.current) {
        setMessage(
          'The request could not be confirmed. Refreshing saved coaching does not send code again or make another model call.'
        );
      }
    } finally {
      await refresh();
      if (mounted.current) {
        setActing(false);
      }
      onBusyChange(false);
    }
  };
  return { saved, attempt, loading, acting, error, message, refresh, request };
}
