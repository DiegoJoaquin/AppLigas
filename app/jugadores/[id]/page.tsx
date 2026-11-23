import { notFound } from "next/navigation";
import { getPlayer, getSessionProfile } from "@/lib/data";
import { PlayerProfile } from "@/components/player-profile";

export default async function JugadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, { profile }] = await Promise.all([getPlayer(id), getSessionProfile()]);
  if (!player) notFound();
  return <PlayerProfile player={player} mine={profile?.player_id === player.id} />;
}
