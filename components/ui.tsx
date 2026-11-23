import Link from "next/link";
import type { Match, Team } from "@/lib/types";
import type { FormResult } from "@/lib/data";
import { fmtTime, initials } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Escudo: forma de escudo con el color del club (o su logo si existe) */
/* ------------------------------------------------------------------ */
export function Crest({ team, size = 32 }: { team: Pick<Team, "name" | "color" | "logo_url" | "short_name">; size?: number }) {
  if (team.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logo_url} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
  }
  const label = (team.short_name ?? initials(team.name)).slice(0, 3);
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" className="shrink-0" aria-hidden>
      <path d="M20 1.5 37 6.5v14.2c0 10.2-7 17.6-17 21.8C10 38.3 3 30.9 3 20.7V6.5Z" fill={team.color} />
      <path d="M20 1.5 37 6.5v14.2c0 10.2-7 17.6-17 21.8C10 38.3 3 30.9 3 20.7V6.5Z" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="1.5" />
      <path d="M3 13h34" stroke="#fff" strokeOpacity=".22" strokeWidth="1.5" />
      <text x="20" y="28.5" textAnchor="middle" fill="#fff" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize={label.length > 2 ? 12.5 : 15}>{label}</text>
    </svg>
  );
}
/** compatibilidad con pantallas antiguas */
export const TeamBadge = Crest;

/* ------------------------------------------------------------------ */
/* Estado del partido                                                  */
/* ------------------------------------------------------------------ */
export function MatchState({ m }: { m: Match }) {
  if (m.status === "en_juego") {
    return <span className="inline-flex items-center gap-1 text-[13px] font-bold text-loss"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" />Vivo</span>;
  }
  if (m.status === "finalizado") return <span className="text-[13px] font-semibold text-muted">Final</span>;
  if (m.status === "suspendido") return <span className="text-[13px] font-semibold text-loss">Susp.</span>;
  return <span className="num text-[15px] font-semibold text-ink">{m.kickoff ? fmtTime(m.kickoff) : "Por def."}</span>;
}

/* ------------------------------------------------------------------ */
/* Fila de partido estilo marcador en vivo                             */
/* ------------------------------------------------------------------ */
export function MatchRow({ m, href, highlight }: { m: Match; href?: string; highlight?: string }) {
  const played = m.home_score !== null && m.away_score !== null && m.status !== "programado";
  const hw = played && m.home_score! > m.away_score!;
  const aw = played && m.away_score! > m.home_score!;
  const side = (t: Team, score: number | null, win: boolean, lose: boolean) => (
    <div className="flex items-center gap-2.5">
      <Crest team={t} size={22} />
      <span className={`min-w-0 flex-1 truncate text-[15px] ${win ? "font-bold" : lose ? "text-muted" : "font-medium"} ${highlight === t.id ? "underline decoration-pen decoration-2 underline-offset-4" : ""}`}>{t.name}</span>
      <span className={`num w-6 text-right text-[19px] ${win ? "font-bold" : lose ? "text-muted" : "font-semibold"}`}>{played ? score : ""}</span>
    </div>
  );
  return (
    <Link href={href ?? `/partidos/${m.id}`} className="grid grid-cols-[58px_1fr] items-center gap-3 px-4 py-3 transition-colors hover:bg-mist sm:px-5">
      <div className="flex flex-col items-start border-r border-line pr-2">
        <MatchState m={m} />
        {m.venue && <span className="mt-0.5 max-w-full truncate text-[11px] text-muted">{m.venue}</span>}
      </div>
      <div className="space-y-1.5">
        {side(m.home, m.home_score, hw, aw)}
        {side(m.away, m.away_score, aw, hw)}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Forma: últimos 5                                                     */
/* ------------------------------------------------------------------ */
const FORM_BG = { G: "bg-win", E: "bg-draw", P: "bg-loss" } as const;
export function FormChips({ form, size = "md" }: { form?: FormResult[]; size?: "sm" | "md" }) {
  if (!form?.length) return <span className="text-sm text-muted">—</span>;
  const s = size === "sm" ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-[12px]";
  return (
    <span className="inline-flex gap-1">
      {form.map((f) => (
        <span key={f.matchId} title={f.label} className={`num inline-flex ${s} items-center justify-center rounded-[5px] font-bold text-white ${FORM_BG[f.r]}`}>{f.r}</span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Encabezados, pestañas y piezas sueltas                               */
/* ------------------------------------------------------------------ */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        <h1 className="display text-[2.75rem] sm:text-[4.5rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Tabs({ items, active }: { items: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {items.map((t) => (
        <Link key={t.key} href={t.href} scroll={false}
          className={`-mb-px whitespace-nowrap border-b-2 pb-3 pt-1 text-[15px] font-semibold transition-colors ${t.key === active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function SectionHead({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="h-section">{title}</h2>
      {href && <Link href={href} className="text-[15px] font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink">{linkLabel ?? "Ver todo"}</Link>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="panel px-6 py-10 text-center text-[15px] text-muted">{children}</div>;
}

export function StatBox({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-4 ${accent ? "bg-ink text-white" : "bg-mist"}`}>
      <div className="num text-[2.5rem] font-bold leading-none">{value}</div>
      <div className={`mt-1.5 text-[13px] font-medium ${accent ? "text-white/70" : "text-muted"}`}>{label}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    programado: ["Programado", "bg-mist text-ink-2"],
    en_juego: ["En vivo", "bg-loss text-white"],
    finalizado: ["Final", "bg-ink text-white"],
    suspendido: ["Suspendido", "bg-yellow text-ink"],
  };
  const [label, cls] = map[status] ?? map.programado;
  return <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${cls}`}>{label}</span>;
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div role="status" className={`mb-5 rounded-xl px-4 py-3 text-[15px] font-medium ${error ? "bg-[#fdecea] text-loss" : "bg-pen-soft text-pen"}`}>
      {error ?? ok}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Foto de jugador (o iniciales con el color del club)                 */
/* ------------------------------------------------------------------ */
export function Avatar({ name, photo, color, size = 36, ring = false }: { name: string; photo?: string | null; color?: string | null; size?: number; ring?: boolean }) {
  const cls = `shrink-0 rounded-full ${ring ? "ring-2 ring-white" : ""}`;
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} loading="lazy" className={`${cls} object-cover`} style={{ width: size, height: size }} />;
  }
  return (
    <span className={`${cls} inline-flex items-center justify-center font-bold text-white`} style={{ width: size, height: size, background: color ?? "#707072", fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}
