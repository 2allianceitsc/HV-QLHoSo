export { ProfilePage } from './profile/ProfilePage';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-foreground">Page not found</p>
      <a href="/" className="text-primary hover:underline text-sm">
        Return to dashboard
      </a>
    </div>
  );
}
