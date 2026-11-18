'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hintsSchema, hintViewSchema, type Hints } from '@ancora/schemas';

export function useHints(revisionId: string, onBusyChange: (busy: boolean) => void) {
  const [saved, setSaved] = useState<Hints | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mounted = useRef(false);
  const sequence = useRef(0);

  const refresh = useCallback(() => {
    const request = ++sequence.current;
    const read = async () => {
      const response = await fetch(
        `/api/practice/hints?revisionId=${encodeURIComponent(revisionId)}`,
        { cache: 'no-store' }
      );
      if (!response.ok) {
        throw new Error('hints_unavailable');
      }
      return hintsSchema.parse(await response.json());
    };
    return read()
      .then((snapshot) => {
        if (mounted.current && request === sequence.current) {
          setSaved(snapshot);
          setError('');
        }
        return snapshot;
      })
      .catch(() => {
        if (mounted.current && request === sequence.current) {
          setError('Saved hints could not open. Your draft is preserved. Refresh hints to retry.');
        }
        return null;
      })
      .finally(() => {
        if (mounted.current && request === sequence.current) {
          setLoading(false);
        }
      });
  }, [revisionId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const generating = saved?.hints.some((hint) => hint.state === 'generating') ?? false;
  useEffect(() => {
    if (!generating) {
      return;
    }
    const timer = setInterval(() => {
      void refresh();
    }, 2_000);
    return () => clearInterval(timer);
  }, [generating, refresh]);

  const request = async (level: number, retryId?: string) => {
    setActing(true);
    setMessage('');
    onBusyChange(true);
    let confirmed = false;
    try {
      const response = await fetch(
        retryId ? `/api/practice/hints/${retryId}/retry` : '/api/practice/hints',
        {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            retryId
              ? { apiVersion: 1 }
              : { apiVersion: 1, revisionId, id: crypto.randomUUID(), level }
          ),
        }
      );
      if (!response.ok) {
        throw new Error('hint_unconfirmed');
      }
      hintViewSchema.parse(await response.json());
      confirmed = true;
    } catch {
      setMessage(
        'The request could not be confirmed. Your draft is preserved; checking saved hints does not make another model call.'
      );
    } finally {
      const recovered = await refresh();
      if (
        !confirmed &&
        recovered?.hints.some((hint) => hint.level === level && hint.state === 'ready')
      ) {
        setMessage('Recovered the saved hint without another model call.');
      }
      setActing(false);
      onBusyChange(false);
    }
  };

  return { saved, loading, acting, error, message, refresh, request };
}
