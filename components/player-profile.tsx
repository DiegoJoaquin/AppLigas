import Link from "next/link";
import { getCurrentSeason, getPlayerHistory, getPlayerStats } from "@/lib/data";
import { Crest, Empty, MatchRow, StatBox } from "@/components/ui";
import { EventIcon } from "@/components/icons";
import { initials } from "@/lib/format";
import type { Player } from "@/lib/types";

/** Cancha mini con la zona del jugador marcada */
function PositionPitch({ position, color }: { position: string | null; color: string }) {
  const spots: Record<string, [number, number][]> = {
    Arquero: [[50, 90]],
    Defensa: [[50, 72]],
    Mediocampista: [[50, 48]],
    Delantero: [[50, 22]],
  };
  const pts = position ? spots[position] ?? [] : [];
  return (
    <svg viewBox="0 0 100 104" className="h-auto w-full max-w-[200px]" role="img" aria-label={position ? `Posición: ${position}` : "Posición no definida"}>
      <rect x="1" y="1" width="98" height="102" rx="6" fill="#f5f5f5" stroke="#d4d4d6" />
      <g fill="none" stroke="#d4d4d6" strokeWidth="1">
        <path d="M1 52h98" /><circle cx="50" cy="52" r="11" />
        <rect x="26" y="1" width="48" height="16" /><rect x="38" y="1" width="24" height="6" />
        <rect x="26" y="87" width="48" height="16" /><rect x="38" y="97" width="24" height="6" />
      </g>
      {pts.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={13} fill={color} opacity={0.18} /><circle cx={x} cy={y} r={6.5} fill={color} /></g>)}
    </svg>
  );
}

export async function PlayerProfile({ player, mine = false }: { player: Player; mine?: boolean }) {
  const season = await getCurrentSeason();
  const [stats, history] = season
    ? await Promise.all([getPlayerStats(season.id), getPlayerHistory(player.id, player.team_id, season.id)])
    : [[], { matches: [], events: [] }];
  const s = stats.find((x) => x.player_id === player.id);
  const color = player.team?.color ?? "#111111";
  const evIn = (matchId: string) => history.events.filter((e) => e.match_id === matchId);
  const scorers = stats.filter((x) => x.goles > 0).sort((a, b) => b.goles - a.goles);
  const rank = s && s.goles > 0 ? scorers.findIndex((x) => x.goles === s.goles) + 1 : null;

  // goles por fecha (en orden cronológico)
  const timeline = [...history.matches].reverse().map((m) => ({
    n: m.matchday?.number ?? 0,
    g: evIn(m.id).filter((e) => e.type === "gol" || e.type === "penal").length,
  }));
  const maxG = Math.max(1, ...timeline.map((x) => x.g));

  return (
    <div className="space-y-10">
      <section className="relative -mx-4 -mt-6 overflow-hidden px-4 pb-8 pt-10 text-white sm:mx-0 sm:mt-0 sm:rounded-[24px] sm:px-8" style={{ background: color }}>
        <span className="display pointer-events-none absolute -bottom-6 right-2 select-none text-[14rem] text-white/15 sm:text-[20rem]" aria-hidden>{player.number ?? ""}</span>
        <div className="relative flex items-end gap-5">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_url} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-white/25" />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">{initials(player.full_name)}</span>
          )}
          <div className="min-w-0 pb-1">
            {mine && <span className="mb-2 inline-block rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink">Tu perfil</span>}
            <h1 className="display text-[2.75rem] sm:text-[4.5rem]">{player.full_name}</h1>
            <p className="mt-2 text-[17px] text-white/85">{player.position ?? "Jugador"}{player.number ? `, camiseta ${player.number}` : ""}</p>
          </div>
        </div>
        {player.team && (
          <Link href={`/equipos/${player.team.id}`} className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-[15px] font-semibold text-ink">
            <Crest team={player.team} size={24} /> {player.team.name}
          </Link>
        )}
      </section>

      <section>
        <h2 className="h-section mb-3">{season?.name ?? "Temporada"}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <StatBox label="Goles" value={s?.goles ?? 0} accent />
          <StatBox label="Partidos" value={s?.pj ?? 0} />
          <StatBox label="Asistencias" value={s?.asistencias ?? 0} />
          <StatBox label="Amarillas" value={s?.amarillas ?? 0} />
          <StatBox label="Rojas" value={s?.rojas ?? 0} />
        </div>
        {s && s.pj > 0 && (
          <p className="mt-3 text-[15px] text-muted">
            {(s.goles / s.pj).toFixed(2).replace(".", ",")} goles por partido{rank ? `, ${rank}° en la tabla de goleadores` : ""}.
          </p>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-[1fr_240px]">
        <section className="rounded-[20px] bg-mist p-5">
          <h2 className="mb-4 text-[17px] font-bold">Goles por fecha</h2>
          {timeline.length ? (
            <div className="flex h-36 items-end gap-2">
              {timeline.map((x, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="num text-[15px] font-bold">{x.g || ""}</span>
                  <span className="w-full max-w-10 rounded-t-md" style={{ height: `${Math.max(4, (x.g / maxG) * 96)}px`, background: x.g ? color : "#d4d4d6" }} />
                  <span className="num text-[13px] text-muted">F{x.n}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[15px] text-muted">Sin partidos todavía.</p>}
        </section>
        <section className="flex flex-col items-center rounded-[20px] bg-mist p-5">
          <h2 className="mb-3 self-start text-[17px] font-bold">Posición</h2>
          <PositionPitch position={player.position} color={color} />
          <p className="mt-2 text-[15px] font-medium">{player.position ?? "Sin definir"}</p>
        </section>
      </div>

      <section>
        <h2 className="h-section mb-3">Partidos</h2>
        {history.matches.length === 0 ? <Empty>Todavía no hay partidos registrados para este jugador.</Empty> : (
          <div className="card overflow-hidden">
            {history.matches.map((m) => {
              const ev = evIn(m.id);
              return (
                <div key={m.id} className="border-b border-line last:border-0">
                  <div className="flex items-center justify-between bg-mist px-5 py-1.5 text-[13px] font-semibold text-muted">
                    <span>{m.matchday?.name ?? `Fecha ${m.matchday?.number}`}</span>
                    <span className="flex gap-1">{ev.map((e) => <EventIcon key={e.id} type={e.type} size={14} />)}</span>
                  </div>
                  <MatchRow m={m} highlight={player.team_id ?? undefined} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
