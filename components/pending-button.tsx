"use client";
import { useFormStatus } from "react-dom";

/** Botón de formulario que reacciona al toque (se marca mientras guarda) */
export function PendingButton({ name, value, className, children }: { name: string; value: string; className: string; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get(name) === value;
  return (
    <button name={name} value={value} disabled={pending} className={`${className} ${mine ? "animate-pulse" : ""} disabled:opacity-60`}>
      {children}
    </button>
  );
}
