import Link from "next/link";
import { computeForm, getCurrentSeason, getMatchdays, getPlayerStats, getStandings } from "@/lib/data";
import { Avatar, Crest, Empty, FormChips, MatchRow, SectionHead } from "@/components/ui";
import { MatchCard } from "@/components/match-card";
import { fmtDate } from "@/lib/format";
import { LEAGUE_NAME } from "@/lib/brand";
import { LiveRefresh } from "@/components/live-refresh";

export default async function Home() {
  const season = await getCurrentSeason();
  if (!season) {
    return <Empty>Todavía no hay una temporada creada. Un administrador puede crearla desde <Link className="font-semibold underline" href="/admin">Admin</Link>.</Empty>;
  }

  const [matchdays, standings, stats] = await Promise.all([
    getMatchdays(season.id), getStandings(season.id), getPlayerStats(season.id),
  ]);
  const all = matchdays.flatMap((md) => md.matches ?? []);
  const form = computeForm(all);

  const played = matchdays.filter((md) => md.matches?.some((m) => m.status === "finalizado"));
  const last = played.at(-1);
  const next = matchdays.find((md) => md.matches?.some((m) => m.status === "programado" || m.status === "en_juego"));
  const hero = next ?? last;
  const results = next && last ? last : played.at(-2);
  const scorers = [...stats].filter((s) => s.goles > 0).sort((a, b) => b.goles - a.goles || b.pj - a.pj);
  const top = scorers[0];
  const goals = all.filter((m) => m.status === "finalizado").reduce((a, m) => a + (m.home_score ?? 0) + (m.away_score ?? 0), 0);

  return (
    <div className="space-y-12 sm:space-y-16">
      <LiveRefresh live={all.some((m) => m.status === "en_juego")} />
      {/* Portada: la fecha en curso, en grande */}
      {hero ? (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-[15px] font-semibold text-muted">{LEAGUE_NAME}, {season.name}</p>
              <h1 className="display mt-1 text-[5.5rem] sm:text-[9rem]">{hero.name ?? `Fecha ${hero.number}`}</h1>
            </div>
            <div className="pb-2 sm:pb-4 sm:text-right">
              <p className="text-[17px] font-semibold">{fmtDate(hero.matches?.find((m) => m.kickoff)?.kickoff ?? hero.date, { weekday: "long", day: "numeric", month: "long" })}</p>
              <p className="text-[15px] text-muted">
                {hero.matches?.some((m) => m.status === "en_juego") ? <LiveRefresh live showBadge /> : hero === next ? `${hero.matches?.length ?? 0} partidos por jugar` : "Última fecha jugada"}
              </p>
            </div>
          </div>
          <div className="no-scrollbar -mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {hero.matches?.map((m) => <MatchCard key={m.id} m={m} />)}
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/fechas/${hero.number}`} className="btn-primary">Ver la fecha completa</Link>
            <Link href="/fechas" className="btn-ghost">Calendario</Link>
          </div>
        </section>
      ) : <Empty>Aún no hay partidos programados.</Empty>}

      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="space-y-12">
          {results && (
            <section>
              <SectionHead title={`Resultados ${results.name ?? `fecha ${results.number}`}`} href={`/fechas/${results.number}`} linkLabel="Detalle" />
              <div className="card divide-y divide-line overflow-hidden">
                {results.matches?.map((m) => <MatchRow key={m.id} m={m} />)}
              </div>
            </section>
          )}

          {/* La temporada en cifras */}
          <section>
            <SectionHead title="La temporada" />
            <dl className="grid grid-cols-3 divide-x divide-line rounded-[20px] bg-mist py-5">
              {[
                [played.length, "fechas jugadas"],
                [goals, "goles"],
                [played.length ? (goals / Math.max(1, all.filter((m) => m.status === "finalizado").length)).toFixed(1).replace(".", ",") : "0", "goles por partido"],
              ].map(([v, l]) => (
                <div key={String(l)} className="px-4 text-center">
                  <dd className="num text-[2.75rem] font-bold leading-none sm:text-[3.5rem]">{v}</dd>
                  <dt className="mt-1 text-[13px] text-muted">{l}</dt>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-12">
          <section>
            <SectionHead title="Tabla" href="/tabla" linkLabel="Completa" />
            <div className="card overflow-hidden">
              <div className="grid grid-cols-[28px_1fr_auto_36px] gap-3 border-b border-line px-4 py-2 text-[12px] font-semibold text-muted">
                <span>#</span><span>Equipo</span><span className="hidden sm:block">Forma</span><span className="text-right">Pts</span>
              </div>
              {standings.slice(0, 6).map((s, i) => (
                <Link key={s.team_id} href={`/equipos/${s.team_id}`} className="grid grid-cols-[28px_1fr_auto_36px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-mist">
                  <span className={`num text-[17px] font-bold ${i === 0 ? "text-pen" : ""}`}>{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5"><Crest team={s} size={22} /><span className="truncate text-[15px] font-medium">{s.name}</span></span>
                  <span className="hidden sm:block"><FormChips form={form.get(s.team_id)?.slice(-3)} size="sm" /></span>
                  <span className="num text-right text-[19px] font-bold">{s.pts}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHead title="Goleadores" href="/estadisticas" linkLabel="Ranking" />
            {top ? (
              <div className="card overflow-hidden">
                <Link href={`/jugadores/${top.player_id}`} className="flex items-center gap-4 bg-ink p-5 text-white">
                  <Avatar name={top.full_name} photo={top.photo_url} color={top.team_color} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white/60">Goleador de la liga</span>
                    <span className="block truncate text-[19px] font-bold leading-tight">{top.full_name}</span>
                    <span className="block truncate text-[14px] text-white/60">{top.team_name}</span>
                  </span>
                  <span className="num text-[3.5rem] font-bold leading-none">{top.goles}</span>
                </Link>
                {scorers.slice(1, 5).map((s, i) => (
                  <Link key={s.player_id} href={`/jugadores/${s.player_id}`} className="flex items-center gap-3 border-t border-line px-5 py-3 hover:bg-mist">
                    <span className="num w-4 text-[15px] font-semibold text-muted">{i + 2}</span>
                    <Avatar name={s.full_name} photo={s.photo_url} color={s.team_color} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{s.full_name}</span>
                    <span className="num text-[19px] font-bold">{s.goles}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty>Sin goles registrados aún.</Empty>}
          </section>
        </aside>
      </div>
    </div>
  );
}
