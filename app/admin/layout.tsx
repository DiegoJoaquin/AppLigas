import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";

export const metadata = { title: "Administración" };

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/fechas", label: "Fechas y partidos" },
  { href: "/admin/equipos", label: "Equipos y jugadores" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <h1 className="text-lg font-bold">Solo administradores</h1>
        <p className="mt-2 text-sm text-muted">Tu cuenta no tiene permisos de administración.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-white">Admin</span>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-white hover:shadow-sm">{l.label}</Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
