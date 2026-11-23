import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlayer, getSessionProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { requestPlayerLink, setMyPhoto, signOut, updateMyName } from "@/app/auth/actions";
import { ImageUpload } from "@/components/image-upload";
import { initials } from "@/lib/format";
import { PlayerProfile } from "@/components/player-profile";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { Player, Team } from "@/lib/types";

export const metadata = { title: "Mi cuenta" };

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; bienvenida?: string }> }) {
  const sp = await searchParams;
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const player = profile.player_id ? await getPlayer(profile.player_id) : null;

  let pending: Player | null = null;
  let options: (Player & { team: Team | null })[] = [];
  if (!player) {
    if (profile.requested_player_id) pending = await getPlayer(profile.requested_player_id);
    const sb = await createClient();
    const { data } = await sb.from("players").select("*, team:teams(*)").order("full_name");
    options = (data ?? []) as (Player & { team: Team | null })[];
  }
  const byTeam = new Map<string, typeof options>();
  options.forEach((p) => {
    const k = p.team?.name ?? "Sin equipo";
    byTeam.set(k, [...(byTeam.get(k) ?? []), p]);
  });

  return (
    <div className="space-y-8">
      <Flash ok={sp.ok ?? (undefined)} error={sp.error} />

      {player && (
        <section className="rounded-[24px] bg-mist p-5 sm:p-6">
          <h2 className="mb-1 text-[17px] font-bold">Tu foto</h2>
          <p className="mb-4 text-[15px] text-ink-2">Aparece en tu ficha, en la planilla de cada partido y en los rankings.</p>
          <ImageUpload kind="foto" path={`jugadores/${player.id}`} currentUrl={player.photo_url} onSaved={setMyPhoto}
            fallback={<span className="text-2xl font-bold text-muted">{initials(player.full_name)}</span>} />
        </section>
      )}

      {player && <PlayerProfile player={player} mine />}

      {!player && (
        <section>
          <h1 className="display text-[3.5rem] sm:text-[5rem]">Hola, {(profile.full_name ?? "hincha").split(" ")[0]}</h1>
          <p className="mt-2 text-[17px] text-ink-2">
            {profile.role === "admin" ? "Tienes acceso de administrador." : "Sigue la liga desde Fechas, Tabla y Estadísticas."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.role === "admin" && <Link href="/admin" className="btn-primary">Ir al panel de administración</Link>}
            <Link href="/" className={profile.role === "admin" ? "btn-ghost" : "btn-primary"}>Ver la liga</Link>
          </div>

          {pending ? (
            <p className="mt-8 rounded-[20px] bg-mist px-5 py-4 text-[15px] text-ink-2">
              Pediste vincularte como <b>{pending.full_name}</b>. Cuando un administrador lo apruebe vas a ver aquí tus goles, partidos y tarjetas.
            </p>
          ) : (
            <details className="group mt-8 rounded-[20px] bg-mist">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <span>
                  <span className="block text-[17px] font-bold">¿También juegas en la liga?</span>
                  <span className="block text-[14px] text-muted">Opcional. Vincula tu ficha para ver tus goles y partidos.</span>
                </span>
                <span className="text-muted transition-transform group-open:rotate-180" aria-hidden>▾</span>
              </summary>
              <div className="px-5 pb-5">
                <form action={requestPlayerLink} className="flex flex-col gap-3 sm:flex-row">
                  <select name="player_id" className="input" required defaultValue="">
                    <option value="" disabled>Busca tu nombre</option>
                    {[...byTeam.entries()].map(([team, ps]) => (
                      <optgroup key={team} label={team}>
                        {ps.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.number ? ` (#${p.number})` : ""}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <SubmitButton className="btn-primary shrink-0" pendingText="Enviando…">Soy yo</SubmitButton>
                </form>
                <p className="mt-3 text-[13px] text-muted">Un administrador confirma que eres tú. ¿No apareces? Pídele al delegado de tu equipo que te agregue.</p>
              </div>
            </details>
          )}
        </section>
      )}

      <section className="border-t border-line pt-8">
        <h2 className="h-section">Mi cuenta</h2>
        <p className="mt-1 text-[15px] text-muted">{profile.email}, {profile.role === "admin" ? "administrador" : profile.role === "jugador" ? "jugador" : "hincha"}</p>
        <form action={updateMyName} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="full_name" className="input" defaultValue={profile.full_name ?? ""} maxLength={80} required />
          <SubmitButton className="btn-ghost shrink-0">Guardar nombre</SubmitButton>
        </form>
        <form action={signOut} className="mt-6">
          <button className="btn-danger">Cerrar sesión</button>
        </form>
      </section>
    </div>
  );
}
