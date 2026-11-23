import { createClient } from "@/lib/supabase/server";
import { setRole, unlinkPlayer } from "../actions";
import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Row = {
  id: string; email: string | null; full_name: string | null; role: string; created_at: string;
  player: { full_name: string } | null;
};

export default async function AdminUsuarios({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("profiles")
    .select("id, email, full_name, role, created_at, player:players!profiles_player_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Usuarios" subtitle={`${rows.length} cuentas registradas`} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="card divide-y divide-line">
        {rows.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-semibold">{u.full_name ?? "—"}</div>
              <div className="truncate text-xs text-muted">{u.email}{u.player ? ` · Jugador: ${u.player.full_name}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={setRole} className="flex items-center gap-2">
                <input type="hidden" name="profile_id" value={u.id} />
                <select name="role" defaultValue={u.role} className="input !w-32 !py-1.5">
                  <option value="fan">Hincha</option><option value="jugador">Jugador</option><option value="admin">Admin</option>
                </select>
                <SubmitButton className="btn-ghost !py-1.5" pendingText="…">OK</SubmitButton>
              </form>
              {u.player && (
                <form action={unlinkPlayer}>
                  <input type="hidden" name="profile_id" value={u.id} />
                  <SubmitButton className="btn-danger !py-1.5" confirm="¿Quitar el vínculo con el jugador?">Desvincular</SubmitButton>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
