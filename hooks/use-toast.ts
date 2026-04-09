"use client";

import { useCallback, useEffect, useState } from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };
const listeners: Array<(s: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(toast: ToasterToast) {
  memoryState = {
    toasts: [toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
  };
  listeners.forEach((l) => l(memoryState));
  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter((t) => t.id !== toast.id),
    };
    listeners.forEach((l) => l(memoryState));
  }, TOAST_REMOVE_DELAY);
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  dispatch({ ...props, id });
  return id;
}

function useToast() {
  const [state, setState] = useState<State>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    memoryState = {
      toasts: memoryState.toasts.filter((t) => t.id !== id),
    };
    listeners.forEach((l) => l(memoryState));
  }, []);

  return { ...state, toast, dismiss };
}

export { useToast, toast };
