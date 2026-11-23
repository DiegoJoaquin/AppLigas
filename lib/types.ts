export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  color: string;
  logo_url: string | null;
  sofascore_id: number | null;
};

export type Player = {
  id: string;
  team_id: string | null;
  full_name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  sofascore_id: number | null;
  team?: Team | null;
};

export type Season = { id: string; name: string; is_current: boolean };

export type MatchStatus = "programado" | "en_juego" | "finalizado" | "suspendido";

export type Match = {
  id: string;
  matchday_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff: string | null;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  sofascore_id: number | null;
  notes: string | null;
  referee?: string | null;
  home: Team;
  away: Team;
  matchday?: Matchday;
};

export type Matchday = {
  id: string;
  season_id: string;
  number: number;
  name: string | null;
  date: string | null;
  matches?: Match[];
};

export type EventType = "gol" | "penal" | "autogol" | "asistencia" | "amarilla" | "roja";

export type MatchEvent = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string | null;
  type: EventType;
  minute: number | null;
  player?: Pick<Player, "id" | "full_name" | "number" | "photo_url"> | null;
};

export type Standing = {
  season_id: string;
  team_id: string;
  name: string;
  short_name: string | null;
  color: string;
  logo_url: string | null;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number;
};

export type PlayerStat = {
  season_id: string;
  player_id: string;
  full_name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  pj: number; goles: number; asistencias: number; amarillas: number; rojas: number;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "jugador" | "fan";
  player_id: string | null;
  requested_player_id: string | null;
};
