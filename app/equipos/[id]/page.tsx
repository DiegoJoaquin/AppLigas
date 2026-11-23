import Link from "next/link";
import { notFound } from "next/navigation";
import { computeForm, getCurrentSeason, getPlayerStats, getSeasonMatches, getStandings, getTeam } from "@/lib/data";
import { Avatar, Crest, Empty, FormChips, MatchRow, StatBox, Tabs } from "@/components/ui";
import { MatchCard } from "@/components/match-card";

const ORDER = ["Arquero", "Defensa", "Mediocampista", "Delantero"];
const PLURAL: Record<string, string> = { Arquero: "Arqueros", Defensa: "Defensas", Mediocampista: "Mediocampistas", Delantero: "Delanteros" };
const TABS = [{ key: "resumen", label: "Resumen" }, { key: "plantel", label: "Plantel" }, { key: "partidos", label: "Partidos" }];

export default async function EquipoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: t } = await searchParams;
  const tab = TABS.some((x) => x.key === t) ? t! : "resumen";
  const season = await getCurrentSeason();
  const { team, players } = await getTeam(id);
  if (!team) notFound();
  const [all, standings, stats] = season
    ? await Promise.all([getSeasonMatches(season.id), getStandings(season.id), getPlayerStats(season.id)])
    : [[], [], []];
  const matches = all.filter((m) => m.home_team_id === id || m.away_team_id === id);
  const form = computeForm(all).get(id);
  const pos = standings.findIndex((s) => s.team_id === id);
  const row = standings[pos];
  const teamStats = stats.filter((s) => s.team_id === id);
  const statOf = (pid: string) => teamStats.find((s) => s.player_id === pid);
  const next = matches.find((m) => m.status === "programado" || m.status === "en_juego");
  const lastPlayed = matches.filter((m) => m.status === "finalizado").at(-1);
  const scorers = [...teamStats].filter((s) => s.goles > 0).sort((a, b) => b.goles - a.goles).slice(0, 5);

  return (
    <div>
      {/* Banda del club */}
      <section className="-mx-4 -mt-6 px-4 pb-8 pt-8 text-white sm:mx-0 sm:mt-0 sm:rounded-[24px] sm:px-8 sm:pt-10" style={{ background: team.color }}>
        <div className="flex items-center gap-5">
          <div className="rounded-[20px] bg-white/15 p-3"><Crest team={team} size={80} /></div>
          <div className="min-w-0">
            <h1 className="display text-[3rem] sm:text-[5.5rem]">{team.name}</h1>
            {row && <p className="mt-2 text-[17px] text-white/85">{pos + 1}° lugar con {row.pts} puntos</p>}
          </div>
        </div>
      </section>

      <div className="mt-6"><Tabs active={tab} items={TABS.map((x) => ({ ...x, href: `/equipos/${id}${x.key === "resumen" ? "" : `?tab=${x.key}`}` }))} /></div>

      <div className="mt-6">
        {tab === "resumen" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-8">
              {row && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  <StatBox label="Puntos" value={row.pts} accent />
                  <StatBox label="Jugados" value={row.pj} />
                  <StatBox label="Ganados" value={row.pg} />
                  <StatBox label="Empates" value={row.pe} />
                  <StatBox label="Perdidos" value={row.pp} />
                  <StatBox label="Diferencia" value={row.dg > 0 ? `+${row.dg}` : row.dg} />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {next && <div><h2 className="mb-2 text-[17px] font-bold">Próximo partido</h2><MatchCard m={next} /></div>}
                {lastPlayed && <div><h2 className="mb-2 text-[17px] font-bold">Último resultado</h2><MatchCard m={lastPlayed} /></div>}
              </div>
            </div>
            <aside className="space-y-6">
              <section className="rounded-[20px] bg-mist p-5">
                <h2 className="mb-3 text-[17px] font-bold">Forma</h2>
                <FormChips form={form} />
              </section>
              <section className="card overflow-hidden">
                <h2 className="border-b border-line px-5 py-3 text-[17px] font-bold">Goleadores del club</h2>
                {scorers.length ? scorers.map((s) => (
                  <Link key={s.player_id} href={`/jugadores/${s.player_id}`} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-mist">
                    <Avatar name={s.full_name} photo={s.photo_url} color={team.color} size={32} />
                    <span className="flex-1 truncate text-[15px] font-medium">{s.full_name}</span>
                    <span className="num text-[21px] font-bold">{s.goles}</span>
                  </Link>
                )) : <p className="px-5 py-4 text-[15px] text-muted">Sin goles todavía.</p>}
              </section>
            </aside>
          </div>
        )}

        {tab === "plantel" && (players.length === 0 ? <Empty>Sin jugadores registrados.</Empty> : (
          <div className="space-y-8">
            {ORDER.concat([""]).map((p) => {
              const list = players.filter((x) => (x.position ?? "") === p).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
              if (!list.length) return null;
              return (
                <section key={p}>
                  <h2 className="h-section mb-3">{PLURAL[p] ?? "Sin posición"}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((pl) => {
                      const s = statOf(pl.id);
                      return (
                        <Link key={pl.id} href={`/jugadores/${pl.id}`} className="flex items-center gap-4 rounded-[16px] bg-mist p-4 hover:bg-line">
                          <span className="relative"><Avatar name={pl.full_name} photo={pl.photo_url} color={team.color} size={56} /><span className="num absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-[14px] font-bold ring-1 ring-line">{pl.number ?? "–"}</span></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[17px] font-semibold">{pl.full_name}</span>
                            <span className="block text-[14px] text-muted">{s?.pj ?? 0} partidos, {s?.goles ?? 0} goles</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ))}

        {tab === "partidos" && (matches.length === 0 ? <Empty>Sin partidos esta temporada.</Empty> : (
          <div className="card overflow-hidden">
            {matches.map((m) => (
              <div key={m.id} className="border-b border-line last:border-0">
                <div className="bg-mist px-5 py-1.5 text-[13px] font-semibold text-muted">{m.matchday?.name ?? `Fecha ${m.matchday?.number}`}</div>
                <MatchRow m={m} highlight={id} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
