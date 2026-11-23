import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSeason, getMatchday, getMatchdays } from "@/lib/data";
import { Empty, MatchRow } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { Match } from "@/lib/types";
import { LiveRefresh } from "@/components/live-refresh";

export default async function FechaPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const n = Number(numero);
  const season = await getCurrentSeason();
  if (!season || !Number.isInteger(n)) notFound();
  const [md, all] = await Promise.all([getMatchday(season.id, n), getMatchdays(season.id)]);
  if (!md) notFound();

  const prev = all.find((x) => x.number === n - 1);
  const next = all.find((x) => x.number === n + 1);
  const finished = md.matches?.filter((m) => m.status === "finalizado") ?? [];
  const goals = finished.reduce((a, m) => a + (m.home_score ?? 0) + (m.away_score ?? 0), 0);

  // agrupar por día
  const byDay = new Map<string, Match[]>();
  for (const m of md.matches ?? []) {
    const k = m.kickoff ? fmtDate(m.kickoff, { weekday: "long", day: "numeric", month: "long" }) : "Horario por definir";
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }

  return (
    <>
      {/* Selector de fechas */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {all.map((x) => (
          <Link key={x.id} href={`/fechas/${x.number}`} aria-current={x.number === n ? "page" : undefined}
            className={`chip num !min-w-12 !px-3 text-[17px] ${x.number === n ? "chip-on" : ""}`}>
            {x.number}
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[4.5rem] sm:text-[7rem]">{md.name ?? `Fecha ${md.number}`}</h1>
          <div className="mt-2"><LiveRefresh live={md.matches?.some((m) => m.status === "en_juego")} showBadge /></div>
          <p className="mt-2 text-[15px] text-muted">
            {season.name}{finished.length ? `, ${finished.length} de ${md.matches?.length} partidos jugados y ${goals} goles` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {prev && <Link href={`/fechas/${prev.number}`} className="btn-ghost" aria-label="Fecha anterior">‹ {prev.number}</Link>}
          {next && <Link href={`/fechas/${next.number}`} className="btn-ghost" aria-label="Fecha siguiente">{next.number} ›</Link>}
        </div>
      </div>

      {md.matches?.length ? (
        <div className="space-y-8">
          {[...byDay.entries()].map(([day, ms]) => (
            <section key={day}>
              <h2 className="mb-2 text-[17px] font-bold">{day}</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {ms.map((m) => <MatchRow key={m.id} m={m} />)}
              </div>
            </section>
          ))}
        </div>
      ) : <Empty>Esta fecha todavía no tiene partidos programados.</Empty>}
    </>
  );
}
