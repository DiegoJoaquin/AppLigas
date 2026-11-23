"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  fechas: <><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  tabla: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M8 4v16" /></>,
  stats: <><path d="M5 20V11M12 20V4M19 20v-6" /></>,
  equipos: <path d="M12 2.5 20 5v6.5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V5z" />,
};

const LINKS = [
  { href: "/", label: "Inicio", icon: I.home },
  { href: "/fechas", label: "Fechas", icon: I.fechas },
  { href: "/tabla", label: "Tabla", icon: I.tabla },
  { href: "/estadisticas", label: "Estadísticas", short: "Stats", icon: I.stats },
  { href: "/equipos", label: "Equipos", icon: I.equipos },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function TopNav() {
  const isActive = useActive();
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}
          className={`rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${isActive(l.href) ? "bg-ink text-white" : "text-ink hover:bg-mist"}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior tipo app (solo celular) */
export function BottomNav() {
  const isActive = useActive();
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5">
        {LINKS.map((l) => {
          const on = isActive(l.href);
          return (
            <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold ${on ? "text-ink" : "text-muted"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={on && l.href === "/" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">{l.icon}</svg>
              {l.short ?? l.label}
              <span className={`h-[3px] w-5 rounded-full ${on ? "bg-pen" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
