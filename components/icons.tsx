export function BallIcon({ size = 16, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="10.5" fill="#fff" stroke={muted ? "#d93025" : "#111"} strokeWidth="1.6" />
      <path d="m12 7 3.8 2.8-1.5 4.4H9.7L8.2 9.8Z" fill={muted ? "#d93025" : "#111"} />
      <path d="M12 7V2.6M15.8 9.8l4.1-1.6M14.3 14.2l2.6 3.8M9.7 14.2l-2.6 3.8M8.2 9.8 4.1 8.2" stroke={muted ? "#d93025" : "#111"} strokeWidth="1.4" />
    </svg>
  );
}

export function CardIcon({ color, size = 16 }: { color: "yellow" | "red"; size?: number }) {
  return (
    <svg width={size * 0.75} height={size} viewBox="0 0 12 16" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="10" height="14" rx="1.8" fill={color === "yellow" ? "#f2c200" : "#d93025"} />
    </svg>
  );
}

export function AssistIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0" fill="none" stroke="#707072" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17h10.5c2 0 3.2-.6 4.4-1.8L21 12" /><path d="M3 17V9l4 2 3-4 4 5" /><path d="M3 21h18" />
    </svg>
  );
}

export function EventIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === "amarilla") return <CardIcon color="yellow" size={size} />;
  if (type === "roja") return <CardIcon color="red" size={size} />;
  if (type === "asistencia") return <AssistIcon size={size} />;
  return <BallIcon size={size} muted={type === "autogol"} />;
}
