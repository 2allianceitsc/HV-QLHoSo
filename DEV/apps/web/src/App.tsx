import { useEffect } from 'react';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePublicConfig } from './hooks/useSystem';

function FaviconUpdater() {
  const { data } = usePublicConfig();
  const version = data?.['BRANDING_VERSION'];
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = `/api/public/branding/favicon${version ? `?v=${version}` : ''}`;
    }
  }, [version]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <FaviconUpdater />
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
