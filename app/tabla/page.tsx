import Link from "next/link";
import { computeForm, getCurrentSeason, getSeasonMatches, getStandings } from "@/lib/data";
import { Crest, Empty, FormChips, PageHeader } from "@/components/ui";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = { title: "Tabla de posiciones" };

export default async function TablaPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const view = ver === "forma" ? "forma" : "tabla";
  const season = await getCurrentSeason();
  if (!season) return <Empty>No hay temporada activa.</Empty>;
  const [rows, matches] = await Promise.all([getStandings(season.id), getSeasonMatches(season.id)]);
  const form = computeForm(matches);
  const zone = (i: number) => (i === 0 ? "bg-pen" : i < 4 ? "bg-[#8fa0ec]" : "bg-transparent");

  return (
    <>
      <PageHeader title="Tabla" subtitle={`${season.name}. Victoria 3 puntos, empate 1.`}>
        <div className="flex gap-2">
          <Link href="/tabla" className={`chip ${view === "tabla" ? "chip-on" : ""}`}>Posiciones</Link>
          <Link href="/tabla?ver=forma" className={`chip ${view === "forma" ? "chip-on" : ""}`}>Forma</Link>
        </div>
      </PageHeader>

      <LiveRefresh live={matches.some((m) => m.status === "en_juego")} />
      <div className="card overflow-hidden">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-line text-[13px] font-semibold text-muted">
              <th className="w-12 py-3 pl-4 text-left font-semibold">#</th>
              <th className="py-3 text-left font-semibold">Equipo</th>
              {view === "tabla" ? (
                <>
                  <th className="w-10 py-3 text-center font-semibold" title="Partidos jugados">PJ</th>
                  {["G", "E", "P"].map((h) => <th key={h} className="hidden w-10 py-3 text-center font-semibold sm:table-cell">{h}</th>)}
                  <th className="hidden w-16 py-3 text-center font-semibold sm:table-cell" title="Goles a favor y en contra">Goles</th>
                  <th className="w-12 py-3 text-center font-semibold" title="Diferencia de gol">DG</th>
                </>
              ) : <th className="py-3 pr-2 text-right font-semibold">Últimos 5</th>}
              <th className="w-14 py-3 pr-4 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team_id} className="border-b border-line last:border-0 hover:bg-mist">
                <td className="relative py-3 pl-4">
                  <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${zone(i)}`} />
                  <span className="num text-[17px] font-bold">{i + 1}</span>
                </td>
                <td className="py-3">
                  <Link href={`/equipos/${r.team_id}`} className="flex items-center gap-3 font-semibold hover:underline hover:underline-offset-4">
                    <Crest team={r} size={26} /><span className="truncate">{r.name}</span>
                  </Link>
                </td>
                {view === "tabla" ? (
                  <>
                    <td className="num py-3 text-center text-[17px]">{r.pj}</td>
                    {[r.pg, r.pe, r.pp].map((v, k) => <td key={k} className="num hidden py-3 text-center text-[17px] text-ink-2 sm:table-cell">{v}</td>)}
                    <td className="num hidden py-3 text-center text-[17px] text-ink-2 sm:table-cell">{r.gf}:{r.gc}</td>
                    <td className={`num py-3 text-center text-[17px] font-semibold ${r.dg > 0 ? "text-win" : r.dg < 0 ? "text-loss" : "text-muted"}`}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                  </>
                ) : <td className="py-3 pr-2 text-right"><FormChips form={form.get(r.team_id)} size="sm" /></td>}
                <td className="num py-3 pr-4 text-right text-[21px] font-bold">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
        <span className="flex items-center gap-2"><span className="h-3 w-1 rounded bg-pen" />Puntero</span>
        <span className="flex items-center gap-2"><span className="h-3 w-1 rounded bg-[#8fa0ec]" />Zona de liguilla</span>
        <span>Desempate: puntos, diferencia de gol, goles a favor.</span>
      </div>
    </>
  );
}
