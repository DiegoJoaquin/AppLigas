"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";

/**
 * Mantiene la página al día sin recargar: escucha los cambios de partidos e
 * incidencias (Supabase Realtime) y, por si acaso, revisa cada `pollSeconds`
 * cuando hay partidos en juego.
 */
export function LiveRefresh({ matchId, live = false, pollSeconds = 30, showBadge = false }: {
  matchId?: string; live?: boolean; pollSeconds?: number; showBadge?: boolean;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 500);
    };
    let channel: ReturnType<ReturnType<typeof browserClient>["channel"]> | null = null;
    try {
      const sb = browserClient();
      const filter = matchId ? { filter: `id=eq.${matchId}` } : {};
      const evFilter = matchId ? { filter: `match_id=eq.${matchId}` } : {};
      channel = sb.channel(`live-${matchId ?? "all"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", ...filter }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_events", ...evFilter }, refresh)
        .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    } catch {
      /* sin realtime: queda el sondeo */
    }
    const poll = live ? setInterval(() => document.visibilityState === "visible" && router.refresh(), pollSeconds * 1000) : null;
    const onFocus = () => live && router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      if (channel) browserClient().removeChannel(channel);
      if (poll) clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [matchId, live, pollSeconds, router]);

  if (!showBadge || !live) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-loss">
      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-loss" /></span>
      {connected ? "En vivo, se actualiza solo" : "En vivo"}
    </span>
  );
}
