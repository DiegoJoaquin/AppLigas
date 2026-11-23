import Link from "next/link";
import { getCurrentSeason, getPlayerStats } from "@/lib/data";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import type { PlayerStat } from "@/lib/types";

export const metadata = { title: "Estadísticas" };

const TABS = [
  { key: "goles", label: "Goles", unit: "goles" },
  { key: "asistencias", label: "Asistencias", unit: "asistencias" },
  { key: "pj", label: "Partidos", unit: "partidos" },
  { key: "amarillas", label: "Amarillas", unit: "amarillas" },
  { key: "rojas", label: "Rojas", unit: "rojas" },
] as const;

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const tab = TABS.find((t) => t.key === ver) ?? TABS[0];
  const key = tab.key as keyof PlayerStat;
  const season = await getCurrentSeason();
  if (!season) return <Empty>No hay temporada activa.</Empty>;
  const stats = await getPlayerStats(season.id);
  const rows = stats.filter((s) => (s[key] as number) > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number) || a.pj - b.pj || a.full_name.localeCompare(b.full_name))
    .slice(0, 50);
  const max = rows.length ? (rows[0][key] as number) : 1;
  const [first, ...rest] = rows;

  return (
    <>
      <PageHeader title="Estadísticas" subtitle={`Los números de cada jugador en ${season.name}.`} />
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`/estadisticas?ver=${t.key}`} className={`chip ${t.key === tab.key ? "chip-on" : ""}`}>{t.label}</Link>
        ))}
      </div>

      {!first ? <Empty>Aún no hay datos para este ranking.</Empty> : (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Líder */}
          <Link href={`/jugadores/${first.player_id}`} className="relative flex min-h-72 flex-col justify-between overflow-hidden rounded-[24px] p-6 text-white" style={{ background: first.team_color ?? "#111" }}>
            <span className="absolute inset-0 bg-black/20" aria-hidden />
            <span className="display pointer-events-none absolute -right-3 -top-6 text-[13rem] text-white/15">{first.number ?? ""}</span>
            <span className="relative"><Avatar name={first.full_name} photo={first.photo_url} color="rgba(255,255,255,.2)" size={84} ring /></span>
            <span className="relative">
              <span className="block text-[15px] text-white/75">Lidera en {tab.label.toLowerCase()}</span>
              <span className="display mt-1 block text-[2.75rem]">{first.full_name}</span>
              <span className="mt-1 block text-[15px] text-white/75">{first.team_name}</span>
              <span className="mt-4 flex items-baseline gap-2"><span className="num text-[4.5rem] font-bold leading-none">{first[key] as number}</span><span className="text-[15px] text-white/75">{tab.unit} en {first.pj} partidos</span></span>
            </span>
          </Link>

          {/* Resto del ranking */}
          <ol className="card overflow-hidden">
            {rest.map((s, i) => (
              <li key={s.player_id} className="border-b border-line last:border-0">
                <Link href={`/jugadores/${s.player_id}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-mist">
                  <span className="num text-[17px] font-semibold text-muted">{i + 2}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2.5"><Avatar name={s.full_name} photo={s.photo_url} color={s.team_color} size={30} /><span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{s.full_name}</span><span className="block truncate text-[13px] text-muted">{s.team_name}</span></span></span>
                    <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-mist">
                      <span className="block h-full rounded-full" style={{ background: s.team_color ?? "#111", width: `${((s[key] as number) / max) * 100}%` }} />
                    </span>
                  </span>
                  <span className="num w-10 text-right text-[24px] font-bold">{s[key] as number}</span>
                </Link>
              </li>
            ))}
            {rest.length === 0 && <li className="px-4 py-6 text-center text-muted">Solo un jugador en este ranking por ahora.</li>}
          </ol>
        </div>
      )}
    </>
  );
}
