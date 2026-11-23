import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Crear cuenta" subtitle="Si eres jugador, después podrás vincular tu cuenta a tu ficha">
      <Flash error={sp.error} />
      <form action={signUp} className="space-y-4">
        <div>
          <label className="label" htmlFor="full_name">Nombre y apellido</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
          <p className="mt-1.5 text-[13px] text-muted">Mínimo 6 caracteres</p>
        </div>
        <SubmitButton className="btn-primary w-full !py-3.5">Crear cuenta</SubmitButton>
      </form>
      <p className="mt-6 text-[15px] text-ink-2">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold underline underline-offset-4">Ingresa</Link>
      </p>
    </AuthShell>
  );
}
