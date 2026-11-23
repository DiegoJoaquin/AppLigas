import Link from "next/link";
import { getCurrentSeason, getMatchdays } from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Fechas" };

export default async function FechasPage() {
  const season = await getCurrentSeason();
  if (!season) return <Empty>No hay temporada activa.</Empty>;
  const mds = await getMatchdays(season.id);
  const current = mds.find((md) => md.matches?.some((m) => m.status !== "finalizado"))?.id;

  return (
    <>
      <PageHeader title="Fechas" subtitle={`${season.name}: el fixture completo, jornada por jornada.`} />
      {mds.length === 0 ? <Empty>Aún no hay fechas creadas.</Empty> : (
        <ol className="border-t border-line">
          {mds.map((md) => {
            const total = md.matches?.length ?? 0;
            const done = md.matches?.filter((m) => m.status === "finalizado").length ?? 0;
            const goals = md.matches?.reduce((a, m) => a + (m.status === "finalizado" ? (m.home_score ?? 0) + (m.away_score ?? 0) : 0), 0) ?? 0;
            const isCurrent = md.id === current;
            const finished = total > 0 && done === total;
            return (
              <li key={md.id} className="border-b border-line">
                <Link href={`/fechas/${md.number}`} className="group grid grid-cols-[64px_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[96px_1fr_auto] sm:py-5">
                  <span className={`display text-[3.25rem] sm:text-[4.5rem] ${finished ? "text-ink" : isCurrent ? "text-pen" : "text-[#c9c9cb]"}`}>{String(md.number).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block text-[19px] font-bold group-hover:underline group-hover:underline-offset-4">{md.name ?? `Fecha ${md.number}`}</span>
                    <span className="block text-[15px] text-muted">{fmtDate(md.date, { weekday: "long", day: "numeric", month: "long" })}</span>
                  </span>
                  <span className="text-right">
                    {finished ? (
                      <><span className="block text-[15px] font-semibold">Jugada</span><span className="block text-[13px] text-muted">{goals} goles</span></>
                    ) : isCurrent ? (
                      <span className="rounded-full bg-pen px-3 py-1 text-[13px] font-semibold text-white">{done > 0 ? `${done} de ${total} jugados` : "Próxima"}</span>
                    ) : (
                      <span className="text-[15px] text-muted">{total} partidos</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
