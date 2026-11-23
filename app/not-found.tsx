import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="display text-[5rem] sm:text-[7rem]">Fuera de juego</h1>
      <p className="mt-3 text-[17px] text-ink-2">Esta página no existe o el link quedó mal copiado.</p>
      <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
