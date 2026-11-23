import Link from "next/link";
import type { Match } from "@/lib/types";
import { Crest, MatchState } from "./ui";
import { fmtDate } from "@/lib/format";

/** Tarjeta grande de partido, para carruseles */
export function MatchCard({ m }: { m: Match }) {
  const played = m.home_score !== null && m.away_score !== null && m.status !== "programado";
  const hw = played && m.home_score! > m.away_score!;
  const aw = played && m.away_score! > m.home_score!;
  return (
    <Link href={`/partidos/${m.id}`} className="group flex w-[min(78vw,300px)] shrink-0 snap-start flex-col rounded-[20px] bg-mist p-5 transition-colors hover:bg-line sm:w-auto">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-muted">{fmtDate(m.kickoff, { weekday: "long" }).split(",")[0]}</span>
        <MatchState m={m} />
      </div>
      <div className="mt-5 space-y-3">
        {[{ t: m.home, s: m.home_score, w: hw, l: aw }, { t: m.away, s: m.away_score, w: aw, l: hw }].map(({ t, s, w, l }) => (
          <div key={t.id} className="flex items-center gap-3">
            <Crest team={t} size={34} />
            <span className={`min-w-0 flex-1 truncate text-[17px] leading-tight ${w ? "font-bold" : l ? "text-muted" : "font-semibold"}`}>{t.name}</span>
            {played && <span className={`num text-[30px] leading-none ${w ? "font-bold" : l ? "text-muted" : "font-semibold"}`}>{s}</span>}
          </div>
        ))}
      </div>
      {m.venue && <div className="mt-5 border-t border-black/5 pt-3 text-[13px] text-muted">{m.venue}</div>}
    </Link>
  );
}
