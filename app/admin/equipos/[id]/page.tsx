import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/data";
import { bulkPlayers, deletePlayer, deleteTeam, savePlayer, saveTeam, setPlayerPhoto, setTeamLogo } from "../../actions";
import { ImageUpload } from "@/components/image-upload";
import { initials } from "@/lib/format";
import { Flash, TeamBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const POSITIONS = ["Arquero", "Defensa", "Mediocampista", "Delantero"];

export default async function AdminEquipo({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { team, players } = await getTeam(id);
  if (!team) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/equipos" className="text-[15px] font-semibold text-muted hover:text-ink">‹ Equipos</Link>
      <Flash ok={sp.ok} error={sp.error} />

      <section className="card p-5">
        <h1 className="display mb-5 text-[2.5rem]">{team.name}</h1>
        <div className="mb-6">
          <span className="label">Escudo</span>
          <ImageUpload kind="escudo" path={`escudos/${team.id}`} currentUrl={team.logo_url} onSaved={setTeamLogo.bind(null, team.id)} fallback={<TeamBadge team={{ ...team, logo_url: null }} size={56} />} />
        </div>
        <form action={saveTeam} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={team.id} />
          <div><label className="label">Nombre</label><input name="name" defaultValue={team.name} className="input" required /></div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div><label className="label">Sigla</label><input name="short_name" defaultValue={team.short_name ?? ""} maxLength={4} className="input uppercase" /></div>
            <div><label className="label">Color</label><input name="color" type="color" defaultValue={team.color} className="h-[42px] w-full cursor-pointer rounded-xl ring-1 ring-line" /></div>
          </div>
          <div className="flex gap-2"><SubmitButton className="btn-primary">Guardar equipo</SubmitButton></div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 pt-5"><h2 className="section-title">Plantel ({players.length})</h2></div>
        <div className="mt-3 divide-y divide-line">
          {players.map((p) => (
            <div key={p.id} className="flex items-start gap-3 px-5 py-3">
              <ImageUpload compact kind="foto" size={48} path={`jugadores/${p.id}`} currentUrl={p.photo_url} onSaved={setPlayerPhoto.bind(null, p.id)}
                fallback={<span className="text-[13px] font-bold text-muted">{initials(p.full_name)}</span>} />
              <div className="min-w-0 flex-1">
                <form action={savePlayer} className="grid grid-cols-[64px_1fr] gap-2 sm:grid-cols-[64px_1fr_170px_auto]">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="team_id" value={team.id} />
                  <input name="number" type="number" min={0} max={99} defaultValue={p.number ?? ""} className="input text-center" aria-label="Número" />
                  <input name="full_name" defaultValue={p.full_name} className="input" required aria-label="Nombre" />
                  <select name="position" defaultValue={p.position ?? ""} className="input col-span-2 sm:col-span-1" aria-label="Posición">
                    <option value="">Posición</option>{POSITIONS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    <SubmitButton className="btn-ghost !px-4 !py-2 text-[14px]" pendingText="…">Guardar</SubmitButton>
                  </div>
                </form>
                <form action={deletePlayer} className="mt-1">
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="team_id" value={team.id} />
                  <SubmitButton className="rounded-full px-1 py-1 text-[13px] font-semibold text-muted hover:text-loss" pendingText="…" confirm={`¿Eliminar a ${p.full_name}? Se borran sus estadísticas.`}>Eliminar jugador</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line bg-mist p-5">
          <h3 className="font-semibold">Agregar jugador</h3>
          <form action={savePlayer} className="mt-2 flex flex-wrap gap-2">
            <input type="hidden" name="team_id" value={team.id} />
            <input name="number" type="number" min={0} max={99} placeholder="N°" className="input !w-16 text-center" />
            <input name="full_name" placeholder="Nombre y apellido" className="input min-w-40 flex-1" required />
            <select name="position" className="input !w-40" defaultValue=""><option value="">Posición</option>{POSITIONS.map((x) => <option key={x}>{x}</option>)}</select>
            <SubmitButton className="btn-dark">Agregar</SubmitButton>
          </form>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-pen">Pegar lista completa de jugadores</summary>
            <form action={bulkPlayers} className="mt-3 space-y-2">
              <input type="hidden" name="team_id" value={team.id} />
              <textarea name="lines" rows={8} className="input font-mono" placeholder={"1, Juan Pérez, Arquero\n4, Pedro Soto, Defensa\n10, Diego Rojas, Mediocampista\n9, Matías Díaz, Delantero"} />
              <p className="text-xs text-muted">Una línea por jugador: número, nombre, posición (número y posición son opcionales). Sirve copiar desde WhatsApp o Excel.</p>
              <SubmitButton className="btn-dark">Agregar todos</SubmitButton>
            </form>
          </details>
        </div>
      </section>

      <form action={deleteTeam} className="text-right">
        <input type="hidden" name="id" value={team.id} />
        <SubmitButton className="btn-danger" confirm={`¿Eliminar ${team.name}?`}>Eliminar equipo</SubmitButton>
      </form>
    </div>
  );
}
