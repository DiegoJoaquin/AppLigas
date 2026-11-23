import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import { isConfigured } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data";
import { APP_NAME, LEAGUE_NAME } from "@/lib/brand";
import { BottomNav, TopNav } from "@/components/nav-links";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: { default: `${LEAGUE_NAME} · ${APP_NAME}`, template: `%s · ${LEAGUE_NAME}` },
  description: `Fixture, resultados, tabla y estadísticas de la ${LEAGUE_NAME}.`,
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile } = isConfigured ? await getSessionProfile() : { profile: null };

  return (
    <html lang="es">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
            <Logo />
            <div className="hidden flex-1 justify-center md:flex"><TopNav /></div>
            <div className="flex items-center gap-2">
              {profile?.role === "admin" && (
                <Link href="/admin" className="rounded-full px-3 py-2 text-[15px] font-semibold hover:bg-mist">Admin</Link>
              )}
              {profile ? (
                <Link href="/perfil" aria-label="Mi cuenta" className="flex h-9 items-center gap-2 rounded-full bg-mist pl-1 pr-3 text-[15px] font-semibold hover:bg-line">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">
                    {(profile.full_name ?? profile.email ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{profile.role === "jugador" ? "Mis números" : "Mi cuenta"}</span>
                </Link>
              ) : (
                <Link href="/login" className="btn-primary !px-4 !py-2">Ingresar</Link>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 md:pb-16">
          {isConfigured ? children : <SetupNotice />}
        </main>

        <footer className="hidden border-t border-line md:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-[14px] text-muted">
            <span className="flex items-center gap-2"><Logo small /> {LEAGUE_NAME}</span>
            <span>Resultados, tabla y goleadores de cada fin de semana.</span>
          </div>
        </footer>

        <BottomNav />
      </body>
    </html>
  );
}

function SetupNotice() {
  return (
    <div className="panel mx-auto max-w-xl p-8">
      <h1 className="display text-4xl">Falta conectar la base de datos</h1>
      <p className="mt-3 text-[15px] text-ink-2">
        Crea el archivo <code className="rounded bg-white px-1">.env.local</code> con los datos de Supabase
        (mira <code className="rounded bg-white px-1">.env.example</code> y <b>LEEME.md</b>) y reinicia la app.
      </p>
    </div>
  );
}
