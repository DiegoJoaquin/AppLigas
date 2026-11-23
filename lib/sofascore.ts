/**
 * Importador de partidos desde Sofascore.
 *
 * Sofascore NO tiene una API oficial pública; esto usa los mismos datos JSON
 * que carga su web. Es gratis, pero puede dejar de funcionar si Sofascore
 * cambia algo o bloquea la petición. Por eso la carga manual siempre existe.
 */

export type SofaEvent = {
  side: "home" | "away";
  type: "gol" | "penal" | "autogol" | "asistencia" | "amarilla" | "roja";
  minute: number | null;
  player: string | null;
};

export type SofaMatch = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "programado" | "en_juego" | "finalizado" | "suspendido";
  startTimestamp: number | null;
  events: SofaEvent[];
};

/** Acepta: link completo (…#id:12345678), "12345678" o …/event/12345678 */
export function parseSofascoreId(input: string): number | null {
  const s = input.trim();
  const m = s.match(/#id:(\d+)/) ?? s.match(/event\/(\d+)/) ?? s.match(/^(\d{5,})$/);
  return m ? Number(m[1]) : null;
}

const HOSTS = ["https://api.sofascore.com/api/v1", "https://www.sofascore.com/api/v1"];

async function getJson(path: string) {
  let lastErr = "sin respuesta";
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "es-CL,es;q=0.9",
          Referer: "https://www.sofascore.com/",
          Origin: "https://www.sofascore.com",
        },
        cache: "no-store",
      });
      if (res.ok) return await res.json();
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  throw new Error(lastErr);
}

function mapStatus(t: string | undefined): SofaMatch["status"] {
  if (t === "finished") return "finalizado";
  if (t === "inprogress") return "en_juego";
  if (t === "postponed" || t === "canceled" || t === "interrupted") return "suspendido";
  return "programado";
}

export async function fetchSofascoreMatch(id: number): Promise<SofaMatch> {
  const { event } = await getJson(`/event/${id}`);
  let incidents: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    incidents = (await getJson(`/event/${id}/incidents`)).incidents ?? [];
  } catch {
    // algunos partidos amateur no tienen incidencias
  }

  const events: SofaEvent[] = [];
  for (const inc of incidents) {
    const side = inc.isHome ? "home" : "away";
    const minute = typeof inc.time === "number" ? inc.time : null;
    if (inc.incidentType === "goal") {
      const type = inc.incidentClass === "penalty" ? "penal" : inc.incidentClass === "ownGoal" ? "autogol" : "gol";
      events.push({ side, type, minute, player: inc.player?.name ?? inc.playerName ?? null });
      if (inc.assist1?.name) events.push({ side, type: "asistencia", minute, player: inc.assist1.name });
    } else if (inc.incidentType === "card") {
      const red = inc.incidentClass === "red" || inc.incidentClass === "yellowRed";
      events.push({ side, type: red ? "roja" : "amarilla", minute, player: inc.player?.name ?? inc.playerName ?? null });
    }
  }
  events.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  return {
    homeTeam: event?.homeTeam?.name ?? "",
    awayTeam: event?.awayTeam?.name ?? "",
    homeScore: event?.homeScore?.current ?? null,
    awayScore: event?.awayScore?.current ?? null,
    status: mapStatus(event?.status?.type),
    startTimestamp: event?.startTimestamp ?? null,
    events,
  };
}
