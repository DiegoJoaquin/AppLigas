const TZ = "America/Santiago";

export function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "Por definir";
  const d = iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  const out = new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", ...opts,
  }).format(d);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  return new Intl.DateTimeFormat("es-CL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Valor para <input type="datetime-local"> en hora de Chile */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** Convierte "2026-11-22T10:30" (hora de Chile) a ISO UTC */
export function fromLocalInput(value: string | null | undefined) {
  if (!value) return null;
  const asUtc = new Date(value + ":00Z");
  // offset de Santiago en esa fecha
  const local = new Date(asUtc.toLocaleString("en-US", { timeZone: TZ }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = utc.getTime() - local.getTime();
  return new Date(asUtc.getTime() + offset).toISOString();
}

export const STATUS_LABEL: Record<string, string> = {
  programado: "Programado",
  en_juego: "En juego",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
};

export const EVENT_LABEL: Record<string, string> = {
  gol: "Gol", penal: "Gol de penal", autogol: "Autogol",
  asistencia: "Asistencia", amarilla: "Amarilla", roja: "Roja",
};

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
