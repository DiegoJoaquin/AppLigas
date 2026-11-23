import Link from "next/link";
import { getCurrentSeason, getStandings, getTeams } from "@/lib/data";
import { Crest, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Equipos" };

export default async function EquiposPage() {
  const [teams, season] = await Promise.all([getTeams(), getCurrentSeason()]);
  const standings = season ? await getStandings(season.id) : [];
  const pos = (id: string) => standings.findIndex((s) => s.team_id === id) + 1;

  return (
    <>
      <PageHeader title="Equipos" subtitle={`${teams.length} clubes en la liga.`} />
      {teams.length === 0 ? <Empty>Aún no hay equipos.</Empty> : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {teams.map((t) => (
            <Link key={t.id} href={`/equipos/${t.id}`} className="group">
              <div className="flex aspect-square items-center justify-center rounded-[20px] bg-mist transition-colors group-hover:bg-line">
                <Crest team={t} size={96} />
              </div>
              <div className="mt-3 text-[17px] font-semibold leading-tight">{t.name}</div>
              {pos(t.id) > 0 && <div className="text-[15px] text-muted">{pos(t.id)}° en la tabla</div>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
