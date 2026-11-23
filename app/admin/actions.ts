"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { LIGA_TAG } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { fromLocalInput } from "@/lib/format";
import { fetchSofascoreMatch, parseSofascoreId } from "@/lib/sofascore";

async function adminClient() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/");
  return sb;
}

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null ? "" : String(v).trim();
};
const nOrNull = (v: string) => (v === "" ? null : Number(v));
const back = (path: string, key: "ok" | "error", text: string): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(text)}`);

function done(path: string, text: string): never {
  revalidateTag(LIGA_TAG);
  revalidatePath("/", "layout");
  return back(path, "ok", text);
}

/* ------------------------------ Temporadas ------------------------------ */

export async function createSeason(f: FormData) {
  const sb = await adminClient();
  const name = s(f, "name");
  if (!name) back("/admin", "error", "Ponle nombre a la temporada.");
  await sb.from("seasons").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await sb.from("seasons").insert({ name, is_current: true });
  if (error) back("/admin", "error", error.message);
  done("/admin", `Temporada "${name}" creada y marcada como actual.`);
}

export async function setCurrentSeason(f: FormData) {
  const sb = await adminClient();
  const id = s(f, "id");
  await sb.from("seasons").update({ is_current: false }).neq("id", id);
  await sb.from("seasons").update({ is_current: true }).eq("id", id);
  done("/admin", "Temporada actual actualizada.");
}

/* -------------------------------- Equipos -------------------------------- */

export async function saveTeam(f: FormData) {
  const sb = await adminClient();
  const id = s(f, "id");
  const row = {
    name: s(f, "name"),
    short_name: s(f, "short_name").toUpperCase().slice(0, 4) || null,
    color: s(f, "color") || "#1d4ed8",
  };
  if (!row.name) back("/admin/equipos", "error", "El equipo necesita un nombre.");
  const { error } = id
    ? await sb.from("teams").update(row).eq("id", id)
    : await sb.from("teams").insert(row);
  if (error) back(id ? `/admin/equipos/${id}` : "/admin/equipos", "error", error.message);
  done(id ? `/admin/equipos/${id}` : "/admin/equipos", "Equipo guardado.");
}

export async function deleteTeam(f: FormData) {
  const sb = await adminClient();
  const { error } = await sb.from("teams").delete().eq("id", s(f, "id"));
  if (error) back(`/admin/equipos/${s(f, "id")}`, "error", "No se puede borrar: el equipo tiene partidos. Borra sus partidos primero.");
  done("/admin/equipos", "Equipo eliminado.");
}

/* ------------------------------- Jugadores ------------------------------- */

export async function savePlayer(f: FormData) {
  const sb = await adminClient();
  const id = s(f, "id");
  const teamId = s(f, "team_id");
  const row = {
    team_id: teamId || null,
    full_name: s(f, "full_name"),
    number: nOrNull(s(f, "number")),
    position: s(f, "position") || null,
  };
  if (!row.full_name) back(`/admin/equipos/${teamId}`, "error", "Falta el nombre del jugador.");
  const { error } = id
    ? await sb.from("players").update(row).eq("id", id)
    : await sb.from("players").insert(row);
  if (error) back(`/admin/equipos/${teamId}`, "error", error.message);
  done(`/admin/equipos/${teamId}`, "Jugador guardado.");
}

/** Pegar varios jugadores: una línea por jugador → "10, Juan Pérez, Delantero" */
export async function bulkPlayers(f: FormData) {
  const sb = await adminClient();
  const teamId = s(f, "team_id");
  const POS: Record<string, string> = { a: "Arquero", ar: "Arquero", d: "Defensa", m: "Mediocampista", me: "Mediocampista", del: "Delantero", de: "Defensa" };
  const rows = s(f, "lines").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
    let number: number | null = null;
    if (parts.length && /^\d{1,3}$/.test(parts[0])) number = Number(parts.shift());
    const name = parts.shift() ?? "";
    const rawPos = (parts.shift() ?? "").toLowerCase();
    const position = ["Arquero", "Defensa", "Mediocampista", "Delantero"].find((p) => p.toLowerCase().startsWith(rawPos) && rawPos) ?? POS[rawPos] ?? null;
    return { team_id: teamId, full_name: name, number, position };
  }).filter((r) => r.full_name);
  if (!rows.length) back(`/admin/equipos/${teamId}`, "error", "No se encontró ningún jugador en el texto.");
  const { error } = await sb.from("players").insert(rows);
  if (error) back(`/admin/equipos/${teamId}`, "error", error.message);
  done(`/admin/equipos/${teamId}`, `${rows.length} jugadores agregados.`);
}

export async function deletePlayer(f: FormData) {
  const sb = await adminClient();
  await sb.from("players").delete().eq("id", s(f, "id"));
  done(`/admin/equipos/${s(f, "team_id")}`, "Jugador eliminado.");
}

/* --------------------------- Fechas y partidos --------------------------- */

export async function createMatchday(f: FormData) {
  const sb = await adminClient();
  const number = Number(s(f, "number"));
  const { error } = await sb.from("matchdays").insert({
    season_id: s(f, "season_id"), number, name: s(f, "name") || `Fecha ${number}`, date: s(f, "date") || null,
  });
  if (error) back("/admin/fechas", "error", /duplicate/.test(error.message) ? `Ya existe la fecha ${number}.` : error.message);
  done("/admin/fechas", `Fecha ${number} creada.`);
}

export async function updateMatchday(f: FormData) {
  const sb = await adminClient();
  await sb.from("matchdays").update({ name: s(f, "name") || null, date: s(f, "date") || null }).eq("id", s(f, "id"));
  done("/admin/fechas", "Fecha actualizada.");
}

export async function deleteMatchday(f: FormData) {
  const sb = await adminClient();
  await sb.from("matchdays").delete().eq("id", s(f, "id"));
  done("/admin/fechas", "Fecha eliminada (con sus partidos).");
}

export async function createMatch(f: FormData) {
  const sb = await adminClient();
  const home = s(f, "home_team_id"), away = s(f, "away_team_id");
  if (!home || !away || home === away) back("/admin/fechas", "error", "Elige dos equipos distintos.");
  const { error } = await sb.from("matches").insert({
    matchday_id: s(f, "matchday_id"), home_team_id: home, away_team_id: away,
    kickoff: fromLocalInput(s(f, "kickoff")), venue: s(f, "venue") || null,
  });
  if (error) back("/admin/fechas", "error", error.message);
  done("/admin/fechas", "Partido programado.");
}

/** Genera todas las fechas (todos contra todos) para la temporada actual */
export async function generateFixture(f: FormData) {
  const sb = await adminClient();
  const seasonId = s(f, "season_id");
  const firstDate = s(f, "first_date");
  const rounds = s(f, "vueltas") === "2" ? 2 : 1;
  const { count } = await sb.from("matchdays").select("id", { count: "exact", head: true }).eq("season_id", seasonId);
  if (count) back("/admin/fechas", "error", "La temporada ya tiene fechas. Bórralas primero o agrega partidos a mano.");
  const { data: teams } = await sb.from("teams").select("id").order("name");
  let ids: (string | null)[] = (teams ?? []).map((t) => t.id as string);
  if (ids.length < 2) back("/admin/fechas", "error", "Necesitas al menos 2 equipos.");
  if (ids.length % 2) ids.push(null); // equipo libre
  const n = ids.length;
  const perRound = n - 1;
  for (let r = 0; r < perRound * rounds; r++) {
    const number = r + 1;
    const date = firstDate ? new Date(new Date(firstDate + "T12:00:00Z").getTime() + r * 7 * 864e5).toISOString().slice(0, 10) : null;
    const { data: md, error } = await sb.from("matchdays")
      .insert({ season_id: seasonId, number, name: `Fecha ${number}`, date }).select("id").single();
    if (error || !md) back("/admin/fechas", "error", error?.message ?? "Error creando fecha");
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      let h = ids[i], a = ids[n - 1 - i];
      if ((r % perRound) % 2 === 1) [h, a] = [a, h];
      if (r >= perRound) [h, a] = [a, h]; // segunda vuelta: se invierte la localía
      if (h && a) matches.push({ matchday_id: md!.id, home_team_id: h, away_team_id: a });
    }
    if (matches.length) await sb.from("matches").insert(matches);
    ids = [ids[0], ids[n - 1], ...ids.slice(1, n - 1)];
  }
  done("/admin/fechas", `Fixture generado: ${perRound * rounds} fechas. Ahora ajusta horarios y canchas.`);
}

export async function updateMatch(f: FormData) {
  const sb = await adminClient();
  const id = s(f, "id");
  const row: Record<string, unknown> = {
    status: s(f, "status") || "programado",
    kickoff: fromLocalInput(s(f, "kickoff")), venue: s(f, "venue") || null, notes: s(f, "notes") || null,
    referee: s(f, "referee") || null, sofascore_id: nOrNull(s(f, "sofascore_id")),
  };
  // Si hay goles cargados con jugador, el marcador se calcula solo; si no, se usa el escrito a mano
  const { count } = await sb.from("match_events").select("id", { count: "exact", head: true })
    .eq("match_id", id).in("type", ["gol", "penal", "autogol"]);
  if (!count) {
    const hs = nOrNull(s(f, "home_score")), as = nOrNull(s(f, "away_score"));
    row.home_score = hs; row.away_score = as;
    if (hs !== null && as !== null && row.status === "programado") row.status = "finalizado";
  }
  const { error } = await sb.from("matches").update(row).eq("id", id);
  if (error) back(`/admin/partidos/${id}`, "error", error.message);
  done(`/admin/partidos/${id}`, "Partido guardado.");
}

export async function setMatchStatus(f: FormData) {
  const sb = await adminClient();
  const id = s(f, "id");
  const status = s(f, "status");
  const patch: Record<string, unknown> = { status };
  if (status === "en_juego" || status === "finalizado") {
    const { data: m } = await sb.from("matches").select("home_score, away_score").eq("id", id).single();
    if (m?.home_score == null) patch.home_score = 0;
    if (m?.away_score == null) patch.away_score = 0;
  }
  await sb.from("matches").update(patch).eq("id", id);
  const label: Record<string, string> = { en_juego: "Partido en juego.", finalizado: "Partido terminado.", programado: "Partido reabierto." };
  done(`/admin/partidos/${id}`, label[status] ?? "Estado actualizado.");
}

/** Carga rápida: un toque por gol, asistencia o tarjeta (sin minuto) */
export async function quickEvent(f: FormData) {
  const sb = await adminClient();
  const matchId = s(f, "match_id");
  const teamId = s(f, "team_id");
  const type = s(f, "type");
  const playerId = s(f, "player_id") || null;
  if (type !== "autogol" && !playerId && type !== "gol") back(`/admin/partidos/${matchId}`, "error", "Elige el jugador primero.");
  const { error } = await sb.from("match_events").insert({ match_id: matchId, team_id: teamId, player_id: type === "autogol" ? null : playerId, type });
  if (error) back(`/admin/partidos/${matchId}`, "error", error.message);
  if (playerId && type !== "autogol") {
    await sb.from("appearances").upsert({ match_id: matchId, player_id: playerId, team_id: teamId }, { onConflict: "match_id,player_id", ignoreDuplicates: true });
  }
  const label: Record<string, string> = { gol: "Gol", penal: "Gol de penal", autogol: "Autogol", asistencia: "Asistencia", amarilla: "Amarilla", roja: "Roja" };
  done(`/admin/partidos/${matchId}`, `${label[type] ?? "Incidencia"} cargada.`);
}

/** Guarda varios resultados de una fecha de una sola vez */
export async function quickResults(f: FormData) {
  const sb = await adminClient();
  const ids = f.getAll("match_id").map(String);
  const { data: withGoals } = await sb.from("match_events").select("match_id").in("match_id", ids).in("type", ["gol", "penal", "autogol"]);
  const auto = new Set((withGoals ?? []).map((e) => e.match_id as string));
  let saved = 0;
  for (const id of ids) {
    if (auto.has(id)) continue; // su marcador sale de los goles cargados
    const hs = nOrNull(s(f, `h_${id}`)), as = nOrNull(s(f, `a_${id}`));
    if (hs === null || as === null) continue;
    await sb.from("matches").update({ home_score: hs, away_score: as, status: "finalizado" }).eq("id", id);
    saved++;
  }
  done("/admin/fechas", `${saved} resultados guardados.`);
}

export async function deleteMatch(f: FormData) {
  const sb = await adminClient();
  await sb.from("matches").delete().eq("id", s(f, "id"));
  done("/admin/fechas", "Partido eliminado.");
}

export async function addEvent(f: FormData) {
  const sb = await adminClient();
  const matchId = s(f, "match_id");
  const [teamId, playerId] = s(f, "who").split("|");
  if (!teamId) back(`/admin/partidos/${matchId}`, "error", "Elige el jugador o equipo.");
  const { error } = await sb.from("match_events").insert({
    match_id: matchId, team_id: teamId, player_id: playerId || null,
    type: s(f, "type"), minute: nOrNull(s(f, "minute")),
  });
  if (error) back(`/admin/partidos/${matchId}`, "error", error.message);
  // si el jugador no estaba en la planilla, se agrega
  if (playerId) {
    await sb.from("appearances").upsert({ match_id: matchId, player_id: playerId, team_id: teamId }, { onConflict: "match_id,player_id", ignoreDuplicates: true });
  }
  done(`/admin/partidos/${matchId}`, "Incidencia agregada.");
}

export async function deleteEvent(f: FormData) {
  const sb = await adminClient();
  await sb.from("match_events").delete().eq("id", s(f, "id"));
  done(`/admin/partidos/${s(f, "match_id")}`, "Incidencia eliminada.");
}

export async function saveAppearances(f: FormData) {
  const sb = await adminClient();
  const matchId = s(f, "match_id");
  const chosen = f.getAll("p").map(String); // "teamId|playerId"
  await sb.from("appearances").delete().eq("match_id", matchId);
  if (chosen.length) {
    await sb.from("appearances").insert(chosen.map((c) => {
      const [team_id, player_id] = c.split("|");
      return { match_id: matchId, team_id, player_id };
    }));
  }
  done(`/admin/partidos/${matchId}`, `Planilla guardada (${chosen.length} jugadores).`);
}

/* ------------------------------ Sofascore ------------------------------ */

export async function importFromSofascore(f: FormData) {
  const sb = await adminClient();
  const matchId = s(f, "match_id");
  const sofaId = parseSofascoreId(s(f, "sofascore"));
  if (!sofaId) back(`/admin/partidos/${matchId}`, "error", "No reconozco ese link. Pega el link del partido en Sofascore (termina en #id:123456).");

  let data: Awaited<ReturnType<typeof fetchSofascoreMatch>>;
  try {
    data = await fetchSofascoreMatch(sofaId!);
  } catch (e) {
    return back(`/admin/partidos/${matchId}`, "error", `Sofascore no respondió: ${(e as Error).message}. Carga el resultado a mano.`);
  }

  const { data: match } = await sb.from("matches").select("*").eq("id", matchId).single();
  if (!match) back("/admin/fechas", "error", "Partido no encontrado");
  const { data: players } = await sb.from("players").select("id, full_name, team_id, number")
    .in("team_id", [match!.home_team_id, match!.away_team_id]);

  const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim();
  const findPlayer = (name: string | null, teamId: string) => {
    if (!name) return null;
    const n = norm(name);
    const list = (players ?? []).filter((p) => p.team_id === teamId);
    return list.find((p) => norm(p.full_name) === n)
      ?? list.find((p) => norm(p.full_name).split(" ").some((w) => w.length > 2 && n.split(" ").includes(w)))
      ?? null;
  };

  await sb.from("matches").update({
    home_score: data.homeScore, away_score: data.awayScore, status: data.status,
    sofascore_id: sofaId,
  }).eq("id", matchId);

  // Reemplaza las incidencias por las de Sofascore
  await sb.from("match_events").delete().eq("match_id", matchId);
  const events = data.events.map((e) => {
    const teamId = e.side === "home" ? match!.home_team_id : match!.away_team_id;
    // en un autogol, el jugador pertenece al rival
    const playerTeam = e.type === "autogol" ? (e.side === "home" ? match!.away_team_id : match!.home_team_id) : teamId;
    return { match_id: matchId, team_id: teamId, player_id: findPlayer(e.player, playerTeam)?.id ?? null, type: e.type, minute: e.minute };
  });
  if (events.length) await sb.from("match_events").insert(events);
  const unmatched = data.events.filter((_, i) => !events[i].player_id && data.events[i].player).map((e) => e.player);

  done(`/admin/partidos/${matchId}`,
    `Importado desde Sofascore: ${data.homeScore ?? "-"}-${data.awayScore ?? "-"}, ${events.length} incidencias.` +
    (unmatched.length ? ` Revisa estos nombres que no calzaron con tu plantel: ${[...new Set(unmatched)].join(", ")}.` : ""));
}

/* -------------------------------- Usuarios -------------------------------- */

export async function resolveLink(f: FormData) {
  const sb = await adminClient();
  const { error } = await sb.rpc("resolve_player_link", { p_profile: s(f, "profile_id"), p_approve: s(f, "approve") === "1" });
  if (error) back("/admin", "error", error.message);
  done("/admin", s(f, "approve") === "1" ? "Jugador vinculado." : "Solicitud rechazada.");
}

export async function setRole(f: FormData) {
  const sb = await adminClient();
  const { error } = await sb.from("profiles").update({ role: s(f, "role") }).eq("id", s(f, "profile_id"));
  if (error) back("/admin/usuarios", "error", error.message);
  done("/admin/usuarios", "Rol actualizado.");
}

export async function unlinkPlayer(f: FormData) {
  const sb = await adminClient();
  await sb.from("profiles").update({ player_id: null, role: "fan" }).eq("id", s(f, "profile_id")).neq("role", "admin");
  await sb.from("profiles").update({ player_id: null }).eq("id", s(f, "profile_id"));
  done("/admin/usuarios", "Vínculo eliminado.");
}

/* -------------------------------- Fotos -------------------------------- */

export async function setTeamLogo(teamId: string, url: string | null) {
  const sb = await adminClient();
  await sb.from("teams").update({ logo_url: url }).eq("id", teamId);
  revalidateTag(LIGA_TAG);
  revalidatePath("/", "layout");
}

export async function setPlayerPhoto(playerId: string, url: string | null) {
  const sb = await adminClient();
  await sb.from("players").update({ photo_url: url }).eq("id", playerId);
  revalidateTag(LIGA_TAG);
  revalidatePath("/", "layout");
}
