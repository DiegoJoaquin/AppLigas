import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Ingresar" subtitle="Accede para ver tus estadísticas y partidos">
      <Flash ok={sp.ok} error={sp.error} />
      <form action={signIn} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton className="btn-primary w-full !py-3.5">Ingresar</SubmitButton>
      </form>
      <p className="mt-6 text-[15px] text-ink-2">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold underline underline-offset-4">Regístrate</Link>
      </p>
    </AuthShell>
  );
}
