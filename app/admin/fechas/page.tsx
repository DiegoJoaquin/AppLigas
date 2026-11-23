import Link from "next/link";
import { getCurrentSeason, getMatchdays, getTeams } from "@/lib/data";
import { createMatch, createMatchday, deleteMatchday, generateFixture, quickResults, updateMatchday } from "../actions";
import { Empty, Flash, PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmtDate, fmtTime } from "@/lib/format";

export default async function AdminFechas({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const season = await getCurrentSeason();
  if (!season) return <Empty>Primero crea una temporada en <Link href="/admin" className="font-semibold text-pen">Resumen</Link>.</Empty>;
  const [mds, teams] = await Promise.all([getMatchdays(season.id), getTeams()]);
  const nextNumber = (mds.at(-1)?.number ?? 0) + 1;

  return (
    <>
      <PageHeader title="Fechas y partidos" subtitle={season.name} />
      <Flash ok={sp.ok} error={sp.error} />

      {mds.length === 0 && (
        <section className="card mb-6 border-2 border-dashed border-pen p-5">
          <h2 className="font-bold">Generar fixture automático</h2>
          <p className="mt-1 text-sm text-muted">Crea todas las fechas con el sistema todos contra todos para los {teams.length} equipos. Después ajustas horarios y canchas.</p>
          <form action={generateFixture} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="season_id" value={season.id} />
            <div><label className="label">Primera fecha (sábado o domingo)</label><input type="date" name="first_date" className="input" /></div>
            <div><label className="label">Formato</label>
              <select name="vueltas" className="input"><option value="1">Una rueda</option><option value="2">Ida y vuelta</option></select>
            </div>
            <div className="flex items-end"><SubmitButton className="btn-primary w-full" pendingText="Generando…">Generar</SubmitButton></div>
          </form>
        </section>
      )}

      <section className="card mb-8 p-5">
        <h2 className="font-bold">Nueva fecha</h2>
        <form action={createMatchday} className="mt-3 grid gap-3 sm:grid-cols-[100px_1fr_1fr_auto]">
          <input type="hidden" name="season_id" value={season.id} />
          <div><label className="label">N°</label><input name="number" type="number" min={1} defaultValue={nextNumber} className="input" required /></div>
          <div><label className="label">Nombre</label><input name="name" className="input" placeholder={`Fecha ${nextNumber}`} /></div>
          <div><label className="label">Día</label><input name="date" type="date" className="input" /></div>
          <div className="flex items-end"><SubmitButton className="btn-dark w-full">Crear</SubmitButton></div>
        </form>
      </section>

      <div className="space-y-6">
        {[...mds].reverse().map((md) => (
          <details key={md.id} className="card group overflow-hidden" open={md.matches?.some((m) => m.status !== "finalizado")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-bold">{md.name ?? `Fecha ${md.number}`}</div>
                <div className="text-xs text-muted">{fmtDate(md.date, { weekday: "long" })} · {md.matches?.length ?? 0} partidos</div>
              </div>
              <span className="text-muted transition group-open:rotate-180">▾</span>
            </summary>

            <div className="border-t border-line">
              {/* Resultados rápidos */}
              {(md.matches?.length ?? 0) > 0 && (
                <form action={quickResults} className="divide-y divide-line">
                  {md.matches!.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto]">
                      <input type="hidden" name="match_id" value={m.id} />
                      <div className="min-w-0 text-sm">
                        <div className="truncate font-medium">{m.home.name} <span className="text-muted">vs</span> {m.away.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{fmtDate(m.kickoff)} {fmtTime(m.kickoff)}{m.venue ? ` · ${m.venue}` : ""}</span>
                          <StatusPill status={m.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input name={`h_${m.id}`} type="number" min={0} defaultValue={m.home_score ?? ""} className="input !w-14 text-center" aria-label="Goles local" />
                        <span className="text-muted">-</span>
                        <input name={`a_${m.id}`} type="number" min={0} defaultValue={m.away_score ?? ""} className="input !w-14 text-center" aria-label="Goles visita" />
                      </div>
                      <Link href={`/admin/partidos/${m.id}`} className="col-span-2 text-right text-sm font-semibold text-pen sm:col-span-1">Detalle y goles</Link>
                    </div>
                  ))}
                  <div className="bg-mist px-5 py-3 text-right">
                    <SubmitButton className="btn-primary">Guardar resultados</SubmitButton>
                  </div>
                </form>
              )}

              {/* Agregar partido */}
              <form action={createMatch} className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <input type="hidden" name="matchday_id" value={md.id} />
                <select name="home_team_id" className="input" required defaultValue=""><option value="" disabled>Local</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                <select name="away_team_id" className="input" required defaultValue=""><option value="" disabled>Visita</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                <input name="kickoff" type="datetime-local" className="input" defaultValue={md.date ? `${md.date}T10:00` : ""} />
                <input name="venue" className="input" placeholder="Cancha" />
                <SubmitButton className="btn-dark">+ Partido</SubmitButton>
              </form>

              {/* Editar / borrar fecha */}
              <div className="flex flex-wrap items-end gap-3 border-t border-line bg-mist px-5 py-3">
                <form action={updateMatchday} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={md.id} />
                  <input name="name" className="input !w-40" defaultValue={md.name ?? ""} placeholder="Nombre" />
                  <input name="date" type="date" className="input !w-44" defaultValue={md.date ?? ""} />
                  <SubmitButton className="btn-ghost">Actualizar fecha</SubmitButton>
                </form>
                <form action={deleteMatchday}>
                  <input type="hidden" name="id" value={md.id} />
                  <SubmitButton className="btn-danger" confirm={`¿Borrar ${md.name ?? "la fecha"} y TODOS sus partidos?`}>Borrar fecha</SubmitButton>
                </form>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
