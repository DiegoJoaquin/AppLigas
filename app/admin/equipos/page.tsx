import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/data";
import { saveTeam } from "../actions";
import { Flash, PageHeader, TeamBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminEquipos({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const [teams, { data: players }] = await Promise.all([getTeams(), sb.from("players").select("team_id")]);
  const count = (id: string) => (players ?? []).filter((p) => p.team_id === id).length;

  return (
    <>
      <PageHeader title="Equipos y jugadores" subtitle={`${teams.length} equipos`} />
      <Flash ok={sp.ok} error={sp.error} />

      <section className="card mb-6 p-5">
        <h2 className="font-bold">Nuevo equipo</h2>
        <form action={saveTeam} className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px_80px_auto]">
          <input name="name" className="input" placeholder="Nombre del equipo" required />
          <input name="short_name" className="input uppercase" placeholder="Sigla" maxLength={4} />
          <input name="color" type="color" defaultValue="#1d4ed8" className="h-[42px] w-full cursor-pointer rounded-xl ring-1 ring-line" title="Color" />
          <SubmitButton className="btn-dark">Crear</SubmitButton>
        </form>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <Link key={t.id} href={`/admin/equipos/${t.id}`} className="card flex items-center gap-3 p-4 hover:shadow-md">
            <TeamBadge team={t} size={40} />
            <div className="flex-1">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted">{count(t.id)} jugadores</div>
            </div>
            <span className="text-sm font-semibold text-pen">Editar</span>
          </Link>
        ))}
      </div>
    </>
  );
}
