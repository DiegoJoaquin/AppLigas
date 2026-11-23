import Link from "next/link";
import { notFound } from "next/navigation";
import { computeForm, getHeadToHead, getMatch, getSeasonMatches } from "@/lib/data";
import { Avatar, Crest, Empty, FormChips, MatchRow, Tabs } from "@/components/ui";
import { EventIcon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import type { MatchEvent, Team } from "@/lib/types";

const TABS = [
  { key: "resumen", label: "Información" },
  { key: "planilla", label: "Planilla" },
  { key: "cara", label: "Cara a cara" },
];

export default async function PartidoPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: t } = await searchParams;
  const tab = TABS.some((x) => x.key === t) ? t! : "resumen";
  const { match: m, events, appearances } = await getMatch(id);
  if (!m) notFound();

  const played = m.home_score !== null && m.away_score !== null && m.status !== "programado";
  const isHome = (e: MatchEvent) => e.team_id === m.home_team_id;
  const goals = events.filter((e) => ["gol", "penal", "autogol"].includes(e.type));

  return (
    <div>
      {m.matchday && (
        <Link href={`/fechas/${m.matchday.number}`} className="mb-4 inline-flex text-[15px] font-semibold text-muted hover:text-ink">‹ {m.matchday.name ?? `Fecha ${m.matchday.number}`}</Link>
      )}

      {/* Marcador */}
      <section className="rounded-[24px] bg-mist px-4 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-6">
        <p className="text-center text-[14px] font-medium text-muted">
          {fmtDate(m.kickoff, { weekday: "long", day: "numeric", month: "long" })}{m.kickoff ? `, ${fmtTime(m.kickoff)}` : ""}{m.venue ? ` en ${m.venue}` : ""}
        </p>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-6">
          <TeamSide team={m.home} />
          <div className="flex flex-col items-center pt-1">
            {played ? (
              <div className="display flex items-center gap-2 text-[4.25rem] sm:text-[7.5rem]">
                <span className={m.home_score! < m.away_score! ? "text-[#a3a3a5]" : ""}>{m.home_score}</span>
                <span className="px-1 text-[0.55em] font-semibold text-[#c9c9cb]">-</span>
                <span className={m.away_score! < m.home_score! ? "text-[#a3a3a5]" : ""}>{m.away_score}</span>
              </div>
            ) : (
              <div className="display text-[3.5rem] sm:text-[6rem]">{m.kickoff ? fmtTime(m.kickoff) : "vs"}</div>
            )}
            <LiveRefresh matchId={m.id} live={m.status === "en_juego"} />
            <span className={`mt-2 rounded-full px-3 py-1 text-[13px] font-semibold ${m.status === "en_juego" ? "bg-loss text-white" : m.status === "finalizado" ? "bg-ink text-white" : m.status === "suspendido" ? "bg-yellow" : "bg-white"}`}>
              {m.status === "finalizado" ? "Final" : m.status === "en_juego" ? "En vivo" : m.status === "suspendido" ? "Suspendido" : "Por jugar"}
            </span>
          </div>
          <TeamSide team={m.away} />
        </div>
        {goals.length > 0 && (
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-2 text-[14px] text-ink-2 sm:gap-6">
            <ul className="space-y-0.5 text-right">{scorerLines(goals.filter(isHome)).map((l) => <li key={l}>{l}</li>)}</ul>
            <span className="pt-0.5"><EventIcon type="gol" size={14} /></span>
            <ul className="space-y-0.5">{scorerLines(goals.filter((g) => !isHome(g))).map((l) => <li key={l}>{l}</li>)}</ul>
          </div>
        )}
      </section>

      <div className="mt-6">
        <Tabs active={tab} items={TABS.map((x) => ({ ...x, href: `/partidos/${m.id}${x.key === "resumen" ? "" : `?tab=${x.key}`}` }))} />
      </div>

      <div className="mt-6">
        {tab === "resumen" && <Resumen m={m} events={events} />}
        {tab === "planilla" && <Planilla m={m} events={events} appearances={appearances} />}
        {tab === "cara" && <CaraACara m={m} />}
      </div>
    </div>
  );
}

function TeamSide({ team }: { team: Team }) {
  return (
    <Link href={`/equipos/${team.id}`} className="flex flex-col items-center gap-2 text-center">
      <Crest team={team} size={64} />
      <span className="text-[15px] font-bold leading-tight sm:text-[19px]">{team.name}</span>
    </Link>
  );
}

/* --------------------------- Información --------------------------- */
type FullMatch = NonNullable<Awaited<ReturnType<typeof getMatch>>["match"]>;

/** "Felipe Flores (2)", "Juan Pérez (p)", "En contra: Pedro Soto" */
function scorerLines(list: MatchEvent[]) {
  const map = new Map<string, number>();
  for (const e of list) {
    const name = e.type === "autogol" ? `${e.player?.full_name ?? "Autogol"} (en contra)` : `${e.player?.full_name ?? "Sin confirmar"}${e.type === "penal" ? " (penal)" : ""}`;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n));
}

function PeopleList({ title, icon, home, away, m, empty }: { title: string; icon: string; home: MatchEvent[]; away: MatchEvent[]; m: FullMatch; empty: string }) {
  const col = (list: MatchEvent[], t: Team, right: boolean) => {
    const grouped = new Map<string, { e: MatchEvent; n: number; types: string[] }>();
    for (const e of list) {
      const k = e.player_id ?? `x-${e.id}`;
      const g = grouped.get(k) ?? { e, n: 0, types: [] };
      g.n++; g.types.push(e.type); grouped.set(k, g);
    }
    return (
      <ul className={`space-y-2.5 ${right ? "sm:text-right" : ""}`}>
        <li className={`flex items-center gap-2 text-[13px] font-semibold text-muted ${right ? "sm:flex-row-reverse" : ""}`}><Crest team={t} size={18} />{t.name}</li>
        {[...grouped.values()].map(({ e, n, types }) => (
          <li key={e.id} className={`flex items-center gap-3 ${right ? "sm:flex-row-reverse" : ""}`}>
            {e.player ? <Avatar name={e.player.full_name} photo={e.player.photo_url} color={t.color} size={34} /> : <span className="h-[34px] w-[34px] rounded-full bg-mist" />}
            <span className="min-w-0 flex-1">
              {e.player
                ? <Link href={`/jugadores/${e.player.id}`} className="block truncate text-[15px] font-semibold hover:underline">{e.player.full_name}</Link>
                : <span className="block text-[15px] font-semibold">{e.type === "autogol" ? "Gol en contra" : "Sin confirmar"}</span>}
              {(types.includes("penal") || types.includes("autogol")) && <span className="block text-[12px] text-muted">{types.includes("penal") ? "De penal" : "Autogol del rival"}</span>}
            </span>
            <span className={`flex items-center gap-0.5 ${right ? "sm:flex-row-reverse" : ""}`}>
              {Array.from({ length: Math.min(n, 5) }).map((_, i) => <EventIcon key={i} type={icon === "auto" ? types[i] : icon} size={16} />)}
              {n > 5 && <span className="num ml-1 font-bold">×{n}</span>}
            </span>
          </li>
        ))}
      </ul>
    );
  };
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-[17px] font-bold">{title}</h2>
      {home.length + away.length === 0 ? <p className="text-[15px] text-muted">{empty}</p> : (
        <div className="grid gap-6 sm:grid-cols-2">
          {home.length > 0 ? col(home, m.home, false) : <div className="hidden sm:block" />}
          {away.length > 0 && col(away, m.away, true)}
        </div>
      )}
    </section>
  );
}

async function Resumen({ m, events }: { m: FullMatch; events: MatchEvent[] }) {
  const seasonId = m.matchday?.season_id;
  const form = seasonId ? computeForm(await getSeasonMatches(seasonId)) : new Map();
  const by = (types: string[], teamId: string) => events.filter((e) => types.includes(e.type) && e.team_id === teamId);
  const G = ["gol", "penal", "autogol"], A = ["asistencia"], C = ["amarilla", "roja"];
  const pending = m.status === "programado";
  const goalsLoaded = events.filter((e) => G.includes(e.type)).length;
  const totalGoals = (m.home_score ?? 0) + (m.away_score ?? 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {pending ? (
          <section className="rounded-[20px] bg-mist p-6 text-[15px] text-ink-2">
            Aquí van a aparecer los goles, asistencias y tarjetas a medida que se carguen. La página se actualiza sola.
          </section>
        ) : (
          <>
            <PeopleList title="Goles" icon="auto" m={m} home={by(G, m.home_team_id)} away={by(G, m.away_team_id)}
              empty={totalGoals ? "Los goleadores todavía no se cargan." : "Partido sin goles."} />
            {goalsLoaded > 0 && goalsLoaded < totalGoals && (
              <p className="-mt-3 text-[13px] text-muted">Faltan {totalGoals - goalsLoaded} goleadores por confirmar.</p>
            )}
            <PeopleList title="Asistencias" icon="asistencia" m={m} home={by(A, m.home_team_id)} away={by(A, m.away_team_id)} empty="Sin asistencias registradas." />
            <PeopleList title="Tarjetas" icon="auto" m={m} home={by(C, m.home_team_id)} away={by(C, m.away_team_id)} empty="Sin tarjetas." />
          </>
        )}
      </div>

      <aside className="space-y-6">
        <section className="rounded-[20px] bg-mist p-5 text-[15px]">
          <h2 className="mb-3 text-[17px] font-bold">Datos del partido</h2>
          <dl className="space-y-2">
            <Row k="Fecha" v={m.matchday?.name ?? `Fecha ${m.matchday?.number}`} />
            <Row k="Día" v={fmtDate(m.kickoff, { weekday: "long", day: "numeric", month: "long" })} />
            <Row k="Hora" v={m.kickoff ? fmtTime(m.kickoff) : "Por definir"} />
            <Row k="Cancha" v={m.venue ?? "Por definir"} />
            {m.referee && <Row k="Árbitro" v={m.referee} />}
          </dl>
          {m.notes && <p className="mt-3 border-t border-black/5 pt-3 text-ink-2">{m.notes}</p>}
        </section>
        <section className="rounded-[20px] bg-mist p-5">
          <h2 className="mb-3 text-[17px] font-bold">Forma en la temporada</h2>
          {[m.home, m.away].map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-center gap-2"><Crest team={t} size={22} /><span className="truncate text-[15px] font-medium">{t.name}</span></span>
              <FormChips form={form.get(t.id)} size="sm" />
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
}

/* ----------------------------- Planilla ----------------------------- */
function Planilla({ m, events, appearances }: {
  m: NonNullable<Awaited<ReturnType<typeof getMatch>>["match"]>;
  events: MatchEvent[];
  appearances: Awaited<ReturnType<typeof getMatch>>["appearances"];
}) {
  if (!appearances.length) return <Empty>La planilla de jugadores todavía no se carga.</Empty>;
  const ORDER = ["Arquero", "Defensa", "Mediocampista", "Delantero"];
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[m.home, m.away].map((t) => {
        const list = appearances.filter((a) => a.team_id === t.id)
          .sort((a, b) => ORDER.indexOf(a.player.position ?? "") - ORDER.indexOf(b.player.position ?? "") || (a.player.number ?? 99) - (b.player.number ?? 99));
        return (
          <section key={t.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Crest team={t} size={28} /><span className="text-[17px] font-bold">{t.name}</span>
              <span className="ml-auto text-[13px] text-muted">{list.length} jugadores</span>
            </div>
            <ul>
              {list.map((a) => {
                const ev = events.filter((e) => e.player_id === a.player_id);
                return (
                  <li key={a.player_id}>
                    <Link href={`/jugadores/${a.player_id}`} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-mist">
                      <span className="num w-6 text-center text-[17px] font-bold" style={{ color: t.color }}>{a.player.number ?? "–"}</span>
                      <Avatar name={a.player.full_name} photo={a.player.photo_url} color={t.color} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{a.player.full_name}</span>
                        <span className="block text-[12px] text-muted">{a.player.position ?? ""}</span>
                      </span>
                      <span className="flex gap-1">{ev.map((e) => <EventIcon key={e.id} type={e.type} size={15} />)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------------------- Cara a cara ---------------------------- */
async function CaraACara({ m }: { m: NonNullable<Awaited<ReturnType<typeof getMatch>>["match"]> }) {
  const h2h = await getHeadToHead(m.home_team_id, m.away_team_id, m.id);
  if (!h2h.length) return <Empty>Es el primer partido registrado entre estos equipos.</Empty>;
  let a = 0, b = 0, d = 0;
  for (const x of h2h) {
    const hs = x.home_team_id === m.home_team_id ? x.home_score! : x.away_score!;
    const as = x.home_team_id === m.home_team_id ? x.away_score! : x.home_score!;
    if (hs > as) a++; else if (hs < as) b++; else d++;
  }
  const total = a + b + d;
  return (
    <div className="space-y-6">
      <section className="rounded-[20px] bg-mist p-5">
        <div className="grid grid-cols-3 text-center">
          <div><div className="num text-[3rem] font-bold leading-none">{a}</div><div className="mt-1 text-[13px] text-muted">Ganó {m.home.short_name ?? m.home.name}</div></div>
          <div><div className="num text-[3rem] font-bold leading-none text-muted">{d}</div><div className="mt-1 text-[13px] text-muted">Empates</div></div>
          <div><div className="num text-[3rem] font-bold leading-none">{b}</div><div className="mt-1 text-[13px] text-muted">Ganó {m.away.short_name ?? m.away.name}</div></div>
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full">
          <span style={{ width: `${(a / total) * 100}%`, background: m.home.color }} />
          <span className="bg-draw" style={{ width: `${(d / total) * 100}%` }} />
          <span style={{ width: `${(b / total) * 100}%`, background: m.away.color }} />
        </div>
      </section>
      <div className="card divide-y divide-line overflow-hidden">
        {h2h.map((x) => <MatchRow key={x.id} m={x} />)}
      </div>
    </div>
  );
}
