interface ReportErrorParams {
  statusCode?: number;
  method?: string;
  apiUrl?: string;
  message: string;
  stack?: string;
  pageUrl?: string;
}

/**
 * Fire-and-forget — sends client-side errors to the BE which logs to DB + notifies Google Chat.
 * Uses fetch directly to avoid circular dependency with the axios client.
 * Never throws, never blocks the caller.
 */
export function reportError(params: ReportErrorParams): void {
  // Guard: don't report errors from the error-reporting endpoint itself (infinite loop)
  if (params.apiUrl?.includes('/error-logs')) return;

  void fetch('/api/error-logs', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      pageUrl: params.pageUrl ?? window.location.pathname,
    }),
  }).catch(() => {
    // intentionally silent
  });
}
