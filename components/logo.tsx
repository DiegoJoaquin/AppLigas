import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

/** Marca: una hoja de planilla con un visto en azul lápiz pasta */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="4" y="2" width="24" height="28" rx="4" fill="#111" />
      <path d="M9 9h14M9 14h14M9 19h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="m18.5 21.5 2.6 2.6 5.4-6.1" fill="none" stroke="#2342d6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  if (small) return <Mark size={20} />;
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${APP_NAME}, inicio`}>
      <Mark />
      <span className="display text-[1.65rem] leading-none tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
