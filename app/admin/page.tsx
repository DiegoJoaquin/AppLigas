import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSeason, getMatchdays, getSeasons } from "@/lib/data";
import { createSeason, resolveLink, setCurrentSeason } from "./actions";
import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const [season, seasons, { data: requests }, { count: teamCount }, { count: playerCount }] = await Promise.all([
    getCurrentSeason(),
    getSeasons(),
    sb.from("profiles").select("id, full_name, email, requested_player_id, player:players!profiles_requested_player_id_fkey(full_name, team:teams(name))").not("requested_player_id", "is", null),
    sb.from("teams").select("id", { count: "exact", head: true }),
    sb.from("players").select("id", { count: "exact", head: true }),
  ]);
  const mds = season ? await getMatchdays(season.id) : [];
  const pending = mds.flatMap((md) => (md.matches ?? []).map((m) => ({ ...m, md })))
    .filter((m) => m.status !== "finalizado" && m.kickoff && new Date(m.kickoff) < new Date());

  type Req = { id: string; full_name: string | null; email: string | null; player: { full_name: string; team: { name: string } | null } | null };

  return (
    <>
      <PageHeader title="Panel de administración" subtitle={season ? `Temporada actual: ${season.name}` : "Crea una temporada para empezar"} />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/admin/fechas" n={mds.length} label="Fechas" />
        <QuickLink href="/admin/equipos" n={teamCount ?? 0} label="Equipos" />
        <QuickLink href="/admin/equipos" n={playerCount ?? 0} label="Jugadores" />
        <QuickLink href="/admin/usuarios" n={(requests ?? []).length} label="Solicitudes" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">Partidos sin resultado</h2>
          {pending.length === 0 ? (
            <p className="card px-4 py-6 text-center text-sm text-muted">Todo al día.</p>
          ) : (
            <div className="card divide-y divide-line">
              {pending.map((m) => (
                <Link key={m.id} href={`/admin/partidos/${m.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-mist">
                  <span><span className="text-xs text-muted">F{m.md.number}</span> {m.home.name} vs {m.away.name}</span>
                  <span className="font-semibold text-pen">Cargar</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="section-title mb-3">Solicitudes de jugadores</h2>
          {(requests ?? []).length === 0 ? (
            <p className="card px-4 py-6 text-center text-sm text-muted">No hay solicitudes pendientes.</p>
          ) : (
            <div className="card divide-y divide-line">
              {(requests as unknown as Req[]).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold">{r.full_name} <span className="font-normal text-muted">({r.email})</span></div>
                    <div className="text-muted">dice ser <b>{r.player?.full_name}</b> · {r.player?.team?.name}</div>
                  </div>
                  <div className="flex gap-2">
                    <form action={resolveLink}><input type="hidden" name="profile_id" value={r.id} /><input type="hidden" name="approve" value="1" /><SubmitButton className="btn-primary !py-1.5">Aprobar</SubmitButton></form>
                    <form action={resolveLink}><input type="hidden" name="profile_id" value={r.id} /><input type="hidden" name="approve" value="0" /><SubmitButton className="btn-ghost !py-1.5">Rechazar</SubmitButton></form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="section-title mb-3">Temporadas</h2>
        <div className="card p-5">
          <div className="flex flex-wrap gap-2">
            {seasons.map((s) => (
              <form key={s.id} action={setCurrentSeason}>
                <input type="hidden" name="id" value={s.id} />
                <button className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${s.is_current ? "bg-ink text-white" : "bg-mist text-ink-2 hover:bg-line"}`}>
                  {s.name}{s.is_current ? " ✓" : ""}
                </button>
              </form>
            ))}
          </div>
          <form action={createSeason} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input name="name" className="input" placeholder="Nueva temporada, ej: Clausura 2027" required />
            <SubmitButton className="btn-dark shrink-0">Crear temporada</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-muted">Al crear una temporada nueva queda como actual. El historial anterior se conserva.</p>
        </div>
      </section>
    </>
  );
}

function QuickLink({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <Link href={href} className="card p-4 transition hover:shadow-md">
      <div className="num text-[2.25rem] font-bold leading-none">{n}</div>
      <div className="text-[13px] font-medium text-muted">{label}</div>
    </Link>
  );
}
