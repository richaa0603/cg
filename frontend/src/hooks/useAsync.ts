import { useEffect, useState } from "react";
import type { AsyncStatus } from "../types/gitlas";

export interface AsyncResult<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

/**
 * Runs `fetcher` whenever `key` changes, discarding stale responses.
 * `enabled === false` keeps the hook in the idle state.
 */
export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
  enabled = true,
): AsyncResult<T> {
  const [state, setState] = useState<AsyncResult<T>>({ status: "idle", data: null, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", data: null, error: null });
      return;
    }

    const controller = new AbortController();
    let active = true;
    setState({ status: "loading", data: null, error: null });

    fetcher(controller.signal)
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch((err: unknown) => {
        if (!active || (err as Error)?.name === "AbortError") return;
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // `key` is the intentional dependency: it encodes every input the fetcher reads.
     
  }, [key, enabled]);

  return state;
}
