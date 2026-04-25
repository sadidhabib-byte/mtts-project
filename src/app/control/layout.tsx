export default function ControlLayout({ children }: { children: React.ReactNode }) {
  // This layout is intentionally minimal; the admin chrome lives in
  // `src/app/control/(app)/layout.tsx` so `/control/login` shows no admin UI.
  return (
    <div className="min-h-[calc(100vh-0px)] bg-[var(--background)] text-[var(--foreground)]">
      {children}
    </div>
  );
}

