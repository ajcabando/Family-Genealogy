import { Icon } from './icons';

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-goldDeep text-white shadow-lift">
            <Icon name="tree" className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-inkSoft">A private archive for family, by family</p>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}