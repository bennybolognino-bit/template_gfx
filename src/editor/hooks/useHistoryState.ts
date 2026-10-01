"use client";

import { useCallback, useRef, useState } from "react";
import type { SetStateAction } from "react";

type HistoryControls<T> = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  reset: (value: T) => void;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function useHistoryState<T>(
  initialValue: T,
  limit = 100,
): [T, (action: SetStateAction<T>) => void, HistoryControls<T>] {
  const initialSnapshot = clone(initialValue);
  const valueRef = useRef<T>(initialSnapshot);
  const historyRef = useRef<T[]>([initialSnapshot]);
  const indexRef = useRef(0);

  const [value, setValueState] = useState<T>(
    () => initialSnapshot,
  );
  const [status, setStatus] = useState({
    canUndo: false,
    canRedo: false,
  });

  const refreshStatus = useCallback(() => {
    setStatus({
      canUndo: indexRef.current > 0,
      canRedo: indexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      const next =
        typeof action === "function"
          ? (action as (current: T) => T)(valueRef.current)
          : action;

      if (JSON.stringify(next) === JSON.stringify(valueRef.current)) {
        return;
      }

      const snapshot = clone(next);
      const history = [
        ...historyRef.current.slice(0, indexRef.current + 1),
        snapshot,
      ].slice(-limit);

      historyRef.current = history;
      indexRef.current = history.length - 1;
      valueRef.current = snapshot;
      setValueState(snapshot);
      setStatus({
        canUndo: history.length > 1,
        canRedo: false,
      });
    },
    [limit],
  );

  const apply = useCallback(
    (index: number) => {
      if (index < 0 || index >= historyRef.current.length) return;

      const snapshot = clone(historyRef.current[index]);

      indexRef.current = index;
      valueRef.current = snapshot;
      setValueState(snapshot);
      refreshStatus();
    },
    [refreshStatus],
  );

  const undo = useCallback(() => {
    apply(indexRef.current - 1);
  }, [apply]);

  const redo = useCallback(() => {
    apply(indexRef.current + 1);
  }, [apply]);

  const reset = useCallback(
    (next: T) => {
      const snapshot = clone(next);

      historyRef.current = [snapshot];
      indexRef.current = 0;
      valueRef.current = snapshot;
      setValueState(snapshot);
      refreshStatus();
    },
    [refreshStatus],
  );

  return [
    value,
    setValue,
    {
      ...status,
      undo,
      redo,
      reset,
    },
  ];
}

