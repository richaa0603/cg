import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllAIContext,
  getArchitecture,
  getExperts,
  getReusableComponents,
  getRisks,
  getSimilarProjects,
  type AIContext,
  type Architecture,
  type Expert,
  type SimilarProject,
} from "../services/aiClient";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

function makeIdle<T>(): AsyncState<T> {
  return { status: "idle", data: null, error: null };
}

export function useAIData<T>(
  fetcher: (req: string) => Promise<T>,
  requirement: string,
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>(makeIdle);
  const attempt = useRef(0);

  const run = useCallback(() => {
    if (!requirement.trim()) {
      setState(makeIdle);
      return;
    }
    setState({ status: "loading", data: null, error: null });
    const id = ++attempt.current;
    fetcher(requirement)
      .then((data) => {
        if (attempt.current === id) setState({ status: "success", data, error: null });
      })
      .catch((err: unknown) => {
        if (attempt.current === id) {
          setState({ status: "error", data: null, error: err instanceof Error ? err.message : String(err) });
        }
      });
  }, [fetcher, requirement]);

  useEffect(() => { run(); }, [run]);

  return { ...state, retry: run };
}

// ─── Per-domain convenience hooks ─────────────────────────────────────────

export function useSimilarProjects(requirement: string) {
  return useAIData<SimilarProject[]>(getSimilarProjects, requirement);
}

export function useReusableComponents(requirement: string) {
  return useAIData<string[]>(getReusableComponents, requirement);
}

export function useArchitecture(requirement: string) {
  return useAIData<Architecture>(getArchitecture, requirement);
}

export function useExperts(requirement: string) {
  return useAIData<Expert[]>(getExperts, requirement);
}

export function useRisks(requirement: string) {
  return useAIData<string[]>(getRisks, requirement);
}

// ─── Composite hook for Executive Summary ─────────────────────────────────

export interface AIContextState {
  status: AsyncStatus;
  ctx: AIContext | null;
  error: string | null;
  retry: () => void;
}

export function useAIContext(requirement: string): AIContextState {
  const [state, setState] = useState<AIContextState>({
    status: "idle",
    ctx: null,
    error: null,
    retry: () => {},
  });
  const attempt = useRef(0);

  const run = useCallback(() => {
    if (!requirement.trim()) {
      setState((s) => ({ ...s, status: "idle", ctx: null, error: null }));
      return;
    }
    setState((s) => ({ ...s, status: "loading", ctx: null, error: null }));
    const id = ++attempt.current;
    getAllAIContext(requirement)
      .then((ctx) => {
        if (attempt.current === id) setState((s) => ({ ...s, status: "success", ctx, error: null }));
      })
      .catch((err: unknown) => {
        if (attempt.current === id) {
          setState((s) => ({
            ...s,
            status: "error",
            ctx: null,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      });
  }, [requirement]);

  useEffect(() => { run(); }, [run]);
  useEffect(() => { setState((s) => ({ ...s, retry: run })); }, [run]);

  return state;
}
