import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatch } from "@/lib/data";
import { deleteEvent, deleteMatch, importFromSofascore, quickEvent, saveAppearances, setMatchStatus, updateMatch } from "../../actions";
import { Crest, Flash } from "@/components/ui";
import { EventIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { LiveRefresh } from "@/components/live-refresh";
import { PendingButton } from "@/components/pending-button";
import { EVENT_LABEL, toLocalInput } from "@/lib/format";
import type { Player, Team } from "@/lib/types";

export default async function AdminPartido({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { match: m, events, appearances } = await getMatch(id);
  if (!m) notFound();
  const sb = await createClient();
  const { data } = await sb.from("players").select("*").in("team_id", [m.home_team_id, m.away_team_id]).order("number", { nullsFirst: false });
  const players = (data ?? []) as Player[];
  const squad = (teamId: string) => players.filter((p) => p.team_id === teamId);
  const inLineup = new Set(appearances.map((a) => a.player_id));
  const autoScore = events.some((e) => ["gol", "penal", "autogol"].includes(e.type));

  return (
    <div className="space-y-6">
      <LiveRefresh matchId={m.id} />
      <Link href="/admin/fechas" className="text-[15px] font-semibold text-muted hover:text-ink">‹ Fechas</Link>
      <Flash ok={sp.ok} error={sp.error} />

      {/* Marcador + estado */}
      <section className="rounded-[24px] bg-ink p-5 text-white sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2 text-center"><Crest team={m.home} size={48} /><span className="text-[15px] font-bold leading-tight">{m.home.name}</span></div>
          <div className="display text-[4.5rem]">{m.home_score ?? 0}<span className="px-1 text-[0.5em] text-white/40">-</span>{m.away_score ?? 0}</div>
          <div className="flex flex-col items-center gap-2 text-center"><Crest team={m.away} size={48} /><span className="text-[15px] font-bold leading-tight">{m.away.name}</span></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {m.status === "programado" && <StatusButton id={m.id} status="en_juego" label="Empezar partido" cls="btn-pen" />}
          {m.status === "en_juego" && <StatusButton id={m.id} status="finalizado" label="Terminar partido" cls="btn bg-white text-ink" />}
          {m.status === "finalizado" && <><span className="rounded-full bg-white/15 px-3 py-1.5 text-[14px] font-semibold">Terminado</span><StatusButton id={m.id} status="en_juego" label="Reabrir" cls="btn !py-1.5 text-white/80 hover:text-white" /></>}
          {m.status === "suspendido" && <span className="rounded-full bg-yellow px-3 py-1.5 text-[14px] font-semibold text-ink">Suspendido</span>}
        </div>
        <p className="mt-3 text-center text-[13px] text-white/60">Cada gol que cargues suma al marcador y la web pública se actualiza sola.</p>
      </section>

      {/* Carga rápida */}
      <section>
        <h2 className="h-section mb-3">Carga rápida</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[m.home, m.away].map((t) => <QuickPanel key={t.id} matchId={m.id} team={t} squad={squad(t.id)} />)}
        </div>
      </section>

      {/* Lo cargado */}
      <section className="card p-5">
        <h2 className="mb-3 text-[17px] font-bold">Cargado en este partido</h2>
        {events.length === 0 ? <p className="text-[15px] text-muted">Todavía nada. Usa la carga rápida.</p> : (
          <div className="grid gap-6 sm:grid-cols-2">
            {[m.home, m.away].map((t) => (
              <ul key={t.id} className="divide-y divide-line">
                <li className="flex items-center gap-2 pb-2 text-[14px] font-semibold text-muted"><Crest team={t} size={18} />{t.name}</li>
                {events.filter((e) => e.team_id === t.id).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-[15px]">
                    <EventIcon type={e.type} />
                    <span className="min-w-0 flex-1"><b>{e.player?.full_name ?? (e.type === "autogol" ? "En contra" : "Sin jugador")}</b> <span className="text-muted">{EVENT_LABEL[e.type]}</span></span>
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={e.id} /><input type="hidden" name="match_id" value={m.id} />
                      <button className="rounded-full px-2 py-1 text-[13px] font-semibold text-loss hover:bg-[#fdecea]">Quitar</button>
                    </form>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </section>

      {/* Datos */}
      <section className="card p-5">
        <h2 className="mb-4 text-[17px] font-bold">Datos del partido</h2>
        <form action={updateMatch} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={m.id} />
          {autoScore ? (
            <p className="rounded-xl bg-mist px-4 py-3 text-[14px] text-ink-2 sm:col-span-2">El marcador ({m.home_score}-{m.away_score}) sale de los goles cargados. Para cambiarlo, agrega o quita goles.</p>
          ) : (
            <div className="flex items-end gap-3 sm:col-span-2">
              <div className="flex-1"><label className="label">Goles {m.home.name}</label><input name="home_score" type="number" min={0} defaultValue={m.home_score ?? ""} className="input text-center text-lg font-bold" /></div>
              <div className="pb-3 text-muted">-</div>
              <div className="flex-1"><label className="label">Goles {m.away.name}</label><input name="away_score" type="number" min={0} defaultValue={m.away_score ?? ""} className="input text-center text-lg font-bold" /></div>
            </div>
          )}
          <div><label className="label">Estado</label>
            <select name="status" defaultValue={m.status} className="input">
              <option value="programado">Programado</option><option value="en_juego">En juego</option>
              <option value="finalizado">Terminado</option><option value="suspendido">Suspendido</option>
            </select>
          </div>
          <div><label className="label">Día y hora</label><input name="kickoff" type="datetime-local" defaultValue={toLocalInput(m.kickoff)} className="input" /></div>
          <div><label className="label">Cancha</label><input name="venue" defaultValue={m.venue ?? ""} className="input" /></div>
          <div><label className="label">Árbitro</label><input name="referee" defaultValue={m.referee ?? ""} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Observaciones</label><textarea name="notes" rows={2} defaultValue={m.notes ?? ""} className="input" placeholder="Ej: se jugó con lluvia, W.O., etc." /></div>
          <input type="hidden" name="sofascore_id" value={m.sofascore_id ?? ""} />
          <div className="sm:col-span-2"><SubmitButton className="btn-primary">Guardar datos</SubmitButton></div>
        </form>
      </section>

      {/* Planilla */}
      <section className="card p-5">
        <h2 className="text-[17px] font-bold">Planilla: quién jugó</h2>
        <p className="mt-1 text-[14px] text-muted">Así se cuentan los partidos jugados de cada uno. Quien hace un gol o recibe tarjeta queda marcado solo.</p>
        <form action={saveAppearances} className="mt-4">
          <input type="hidden" name="match_id" value={m.id} />
          <div className="grid gap-6 sm:grid-cols-2">
            {[m.home, m.away].map((t) => (
              <fieldset key={t.id}>
                <legend className="mb-2 flex items-center gap-2 font-semibold"><Crest team={t} size={20} /> {t.name}</legend>
                <div className="space-y-0.5">
                  {squad(t.id).map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[15px] hover:bg-mist">
                      <input type="checkbox" name="p" value={`${t.id}|${p.id}`} defaultChecked={inLineup.has(p.id)} className="h-5 w-5 accent-[#111111]" />
                      <span className="num w-6 text-muted">{p.number ?? ""}</span>{p.full_name}
                    </label>
                  ))}
                  {squad(t.id).length === 0 && <p className="text-[14px] text-muted">Sin jugadores. <Link className="underline" href={`/admin/equipos/${t.id}`}>Agregar</Link></p>}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-4"><SubmitButton className="btn-primary">Guardar planilla</SubmitButton></div>
        </form>
      </section>

      {/* Sofascore */}
      <details className="card p-5">
        <summary className="cursor-pointer text-[17px] font-bold">Importar desde Sofascore</summary>
        <p className="mt-2 text-[14px] text-muted">Si el partido también está en Sofascore, pega su link y se traen marcador, goles, asistencias y tarjetas.</p>
        <form action={importFromSofascore} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="match_id" value={m.id} />
          <input name="sofascore" className="input" placeholder="https://www.sofascore.com/...#id:12345678" defaultValue={m.sofascore_id ?? ""} required />
          <SubmitButton className="btn-dark shrink-0" pendingText="Importando…" confirm="Esto reemplaza lo cargado en este partido. ¿Continuar?">Importar</SubmitButton>
        </form>
      </details>

      <form action={deleteMatch} className="text-right">
        <input type="hidden" name="id" value={m.id} />
        <SubmitButton className="btn-danger" confirm="¿Eliminar este partido y todo lo cargado?">Eliminar partido</SubmitButton>
      </form>
    </div>
  );
}

function StatusButton({ id, status, label, cls }: { id: string; status: string; label: string; cls: string }) {
  return (
    <form action={setMatchStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <SubmitButton className={cls} pendingText="…">{label}</SubmitButton>
    </form>
  );
}

function QuickPanel({ matchId, team, squad }: { matchId: string; team: Team; squad: Player[] }) {
  const btn = "flex flex-col items-center justify-center gap-1 rounded-xl bg-white py-3 text-[13px] font-semibold ring-1 ring-line transition hover:ring-ink active:scale-[.97]";
  return (
    <form action={quickEvent} className="rounded-[20px] bg-mist p-4" style={{ borderTop: `4px solid ${team.color}` }}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="team_id" value={team.id} />
      <div className="mb-3 flex items-center gap-2 text-[17px] font-bold"><Crest team={team} size={26} />{team.name}</div>
      <select name="player_id" className="input" defaultValue="" aria-label={`Jugador de ${team.name}`}>
        <option value="">Elige jugador…</option>
        {squad.map((p) => <option key={p.id} value={p.id}>{p.number ? `${p.number}. ` : ""}{p.full_name}</option>)}
      </select>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button name="type" value="gol" className={`${btn} col-span-2 !bg-ink !text-white !ring-ink`}><EventIcon type="gol" size={20} />Gol</button>
        <PendingButton name="type" value="asistencia" className={btn}><EventIcon type="asistencia" size={20} />Asist.</PendingButton>
        <PendingButton name="type" value="penal" className={btn}><EventIcon type="penal" size={20} />Penal</PendingButton>
        <PendingButton name="type" value="amarilla" className={btn}><EventIcon type="amarilla" size={20} />Amarilla</PendingButton>
        <PendingButton name="type" value="roja" className={btn}><EventIcon type="roja" size={20} />Roja</PendingButton>
        <button name="type" value="autogol" className={`${btn} col-span-2`} title="Gol en contra del rival que suma a este equipo"><EventIcon type="autogol" size={20} />Autogol del rival</button>
      </div>
    </form>
  );
}
