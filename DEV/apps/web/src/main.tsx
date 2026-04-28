import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { queryClient } from './lib/queryClient';
import { reportError } from './lib/reportError';
import { TooltipProvider } from './components/ui/tooltip';
import './index.css';

// Global handler — catches JS runtime errors not caught by components or axios
window.addEventListener('error', (event) => {
  if (event.error instanceof Error) {
    reportError({ message: event.error.message, stack: event.error.stack });
  }
});

// Global handler — catches unhandled promise rejections (e.g. fire-and-forget async throws)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection');
  const stack = reason instanceof Error ? reason.stack : undefined;
  // Skip AxiosError — already handled by the axios response interceptor
  if (reason && typeof reason === 'object' && 'isAxiosError' in reason) return;
  reportError({ message: `Unhandled rejection: ${message}`, stack });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
