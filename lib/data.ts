import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type {
  Match, Matchday, MatchEvent, Player, PlayerStat, Profile, Season, Standing, Team,
} from "./types";

/*
 * Velocidad: los datos de la liga son iguales para todos, así que se guardan en
 * caché en el servidor (etiqueta "liga"). Cada vez que un admin guarda algo, la
 * caché se limpia al instante (revalidateTag en las acciones), así que nunca se
 * ve un dato viejo después de cargarlo. Si se edita directo en Supabase, se
 * renueva sola en 2 minutos.
 */
export const LIGA_TAG = "liga";
let anon: ReturnType<typeof createSupabase> | null = null;
function pub() {
  if (!anon) {
    anon = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anon;
}
function c<A extends unknown[], R>(name: string, fn: (...a: A) => Promise<R>) {
  return cache(unstable_cache(fn, [name], { tags: [LIGA_TAG], revalidate: 120 })) as (...a: A) => Promise<R>;
}

export const MATCH_SELECT =
  "*, home:teams!matches_home_team_id_fkey(*), away:teams!matches_away_team_id_fkey(*)";

export const getCurrentSeason = c("getCurrentSeason", async (): Promise<Season | null> => {
  const sb = pub();
  const { data } = await sb
    .from("seasons").select("*")
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle();
  return data as Season | null;
});

export const getSeasons = c("getSeasons", async (): Promise<Season[]> => {
  const sb = pub();
  const { data } = await sb.from("seasons").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Season[];
});

export const getMatchdays = c("getMatchdays", async (seasonId: string): Promise<Matchday[]> => {
  const sb = pub();
  const { data } = await sb
    .from("matchdays")
    .select(`*, matches(${MATCH_SELECT})`)
    .eq("season_id", seasonId)
    .order("number");
  const mds = (data ?? []) as Matchday[];
  mds.forEach((md) =>
    md.matches?.sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? ""))
  );
  return mds;
});

export const getMatchday = c("getMatchday", async (seasonId: string, number: number): Promise<Matchday | null> => {
  const sb = pub();
  const { data } = await sb
    .from("matchdays")
    .select(`*, matches(${MATCH_SELECT})`)
    .eq("season_id", seasonId).eq("number", number).maybeSingle();
  const md = data as Matchday | null;
  md?.matches?.sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? ""));
  return md;
});

export const getMatch = c("getMatch", async (id: string) => {
  const sb = pub();
  const [{ data: match }, { data: events }, { data: apps }] = await Promise.all([
    sb.from("matches").select(`${MATCH_SELECT}, matchday:matchdays(*)`).eq("id", id).maybeSingle(),
    sb.from("match_events").select("*, player:players(id, full_name, number, photo_url)")
      .eq("match_id", id).order("minute", { ascending: true, nullsFirst: false }),
    sb.from("appearances").select("player_id, team_id, player:players(id, full_name, number, position, photo_url)")
      .eq("match_id", id),
  ]);
  return {
    match: match as Match | null,
    events: (events ?? []) as MatchEvent[],
    appearances: (apps ?? []) as unknown as {
      player_id: string; team_id: string; player: Pick<Player, "id" | "full_name" | "number" | "position" | "photo_url">;
    }[],
  };
});

export const getStandings = c("getStandings", async (seasonId: string): Promise<Standing[]> => {
  const sb = pub();
  const [{ data: rows }, { data: teams }] = await Promise.all([
    sb.from("standings").select("*").eq("season_id", seasonId),
    sb.from("teams").select("*"),
  ]);
  const list = (rows ?? []) as Standing[];
  // Equipos sin partidos jugados aparecen con 0
  for (const t of (teams ?? []) as Team[]) {
    if (!list.find((r) => r.team_id === t.id)) {
      list.push({
        season_id: seasonId, team_id: t.id, name: t.name, short_name: t.short_name,
        color: t.color, logo_url: t.logo_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      });
    }
  }
  return list.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
});

export const getPlayerStats = c("getPlayerStats", async (seasonId: string): Promise<PlayerStat[]> => {
  const sb = pub();
  const { data } = await sb.from("player_stats").select("*").eq("season_id", seasonId);
  return (data ?? []) as PlayerStat[];
});

export const getTeams = c("getTeams", async (): Promise<Team[]> => {
  const sb = pub();
  const { data } = await sb.from("teams").select("*").order("name");
  return (data ?? []) as Team[];
});

export const getTeam = c("getTeam", async (id: string) => {
  const sb = pub();
  const [{ data: team }, { data: players }] = await Promise.all([
    sb.from("teams").select("*").eq("id", id).maybeSingle(),
    sb.from("players").select("*").eq("team_id", id).order("number", { nullsFirst: false }),
  ]);
  return { team: team as Team | null, players: (players ?? []) as Player[] };
});

export const getTeamMatches = c("getTeamMatches", async (teamId: string, seasonId: string): Promise<Match[]> => {
  const sb = pub();
  const { data } = await sb
    .from("matches")
    .select(`${MATCH_SELECT}, matchday:matchdays!inner(*)`)
    .eq("matchday.season_id", seasonId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  return ((data ?? []) as Match[]).sort(
    (a, b) => (a.matchday?.number ?? 0) - (b.matchday?.number ?? 0)
  );
});

export const getPlayer = c("getPlayer", async (id: string) => {
  const sb = pub();
  const { data } = await sb.from("players").select("*, team:teams(*)").eq("id", id).maybeSingle();
  return data as Player | null;
});

/** Historial de partidos de un jugador con sus goles/tarjetas en cada uno */
export const getPlayerHistory = c("getPlayerHistory", async (playerId: string, teamId: string | null, seasonId: string) => {
  const sb = pub();
  const [{ data: apps }, { data: events }] = await Promise.all([
    sb.from("appearances").select("match_id").eq("player_id", playerId),
    sb.from("match_events").select("*").eq("player_id", playerId),
  ]);
  const ids = new Set<string>([
    ...((apps ?? []) as { match_id: string }[]).map((a) => a.match_id),
    ...((events ?? []) as MatchEvent[]).map((e) => e.match_id),
  ]);
  let matches: Match[] = [];
  if (ids.size) {
    const { data } = await sb
      .from("matches")
      .select(`${MATCH_SELECT}, matchday:matchdays!inner(*)`)
      .in("id", [...ids])
      .eq("matchday.season_id", seasonId);
    matches = ((data ?? []) as Match[]).sort(
      (a, b) => (b.matchday?.number ?? 0) - (a.matchday?.number ?? 0)
    );
  }
  return { matches, events: (events ?? []) as MatchEvent[], teamId };
});

export const getSessionProfile = cache(async () => {
  const sb = await createClient();
  // getClaims valida la sesión sin un viaje extra al servidor de login
  const { data: claims } = await sb.auth.getClaims();
  const sub = claims?.claims?.sub as string | undefined;
  if (!sub) return { user: null, profile: null as Profile | null };
  const { data } = await sb.from("profiles").select("*").eq("id", sub).maybeSingle();
  return { user: { id: sub, email: (claims?.claims?.email as string | undefined) ?? null }, profile: data as Profile | null };
});

/** Todos los partidos de la temporada (con su fecha) */
export const getSeasonMatches = c("getSeasonMatches", async (seasonId: string): Promise<Match[]> => {
  const sb = pub();
  const { data } = await sb
    .from("matches")
    .select(`${MATCH_SELECT}, matchday:matchdays!inner(*)`)
    .eq("matchday.season_id", seasonId);
  return ((data ?? []) as Match[]).sort(
    (a, b) => (a.matchday?.number ?? 0) - (b.matchday?.number ?? 0) || (a.kickoff ?? "").localeCompare(b.kickoff ?? "")
  );
});

export type FormResult = { r: "G" | "E" | "P"; matchId: string; label: string };

/** Últimos 5 resultados de cada equipo (más antiguo → más reciente) */
export function computeForm(matches: Match[], n = 5): Map<string, FormResult[]> {
  const map = new Map<string, FormResult[]>();
  for (const m of matches) {
    if (m.status !== "finalizado" || m.home_score == null || m.away_score == null) continue;
    const add = (team: string, gf: number, gc: number, rival: string) => {
      const list = map.get(team) ?? [];
      list.push({ r: gf > gc ? "G" : gf === gc ? "E" : "P", matchId: m.id, label: `${gf}-${gc} vs ${rival}` });
      map.set(team, list);
    };
    add(m.home_team_id, m.home_score, m.away_score, m.away.name);
    add(m.away_team_id, m.away_score, m.home_score, m.home.name);
  }
  for (const [k, v] of map) map.set(k, v.slice(-n));
  return map;
}

/** Enfrentamientos previos entre dos equipos (todas las temporadas) */
export const getHeadToHead = c("getHeadToHead", async (a: string, b: string, excludeId: string): Promise<Match[]> => {
  const sb = pub();
  const { data } = await sb
    .from("matches")
    .select(`${MATCH_SELECT}, matchday:matchdays(*)`)
    .or(`and(home_team_id.eq.${a},away_team_id.eq.${b}),and(home_team_id.eq.${b},away_team_id.eq.${a})`)
    .eq("status", "finalizado")
    .neq("id", excludeId)
    .order("kickoff", { ascending: false })
    .limit(6);
  return (data ?? []) as Match[];
});
