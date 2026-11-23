import { Mark } from "./logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[420px] pt-2 sm:pt-8">
      <Mark size={40} />
      <h1 className="display mt-5 text-[3.5rem]">{title}</h1>
      <p className="mt-2 text-[17px] text-ink-2">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
