"use client";
import { useRef, useState, useTransition } from "react";
import { browserClient } from "@/lib/supabase/client";

/**
 * Sube una imagen a Supabase Storage ya optimizada:
 * - se recorta/achica en el teléfono antes de subir (máx. `max` px)
 * - se convierte a WebP (pesa ~10 veces menos que una foto del celular)
 */
async function optimize(file: File, max: number, square: boolean): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (square) {
    const side = Math.min(bmp.width, bmp.height);
    sx = (bmp.width - side) / 2; sy = (bmp.height - side) / 2; sw = sh = side;
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (blob) return blob;
  return await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.85));
}

export function ImageUpload({
  path, currentUrl, onSaved, kind = "foto", size = 96, fallback, compact = false,
}: {
  path: string;                                  // ej: "escudos/<id>" (sin extensión)
  currentUrl: string | null;
  onSaved: (url: string | null) => Promise<void>; // server action que guarda la URL
  kind?: "escudo" | "foto";
  size?: number;
  fallback?: React.ReactNode;
  compact?: boolean;                             // solo el círculo, para listas
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const round = kind === "foto";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Elige una imagen (JPG, PNG o WebP).");
    setBusy(true);
    try {
      const blob = await optimize(file, kind === "escudo" ? 400 : 600, kind === "foto");
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const sb = browserClient();
      const key = `${path}.${ext}`;
      const { error: upErr } = await sb.storage.from("fotos").upload(key, blob, { upsert: true, contentType: blob.type, cacheControl: "3600" });
      if (upErr) throw new Error(upErr.message);
      const url = `${sb.storage.from("fotos").getPublicUrl(key).data.publicUrl}?v=${Date.now()}`;
      setPreview(url);
      startTransition(() => onSaved(url));
    } catch (e) {
      setError(`No se pudo subir: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className={`group relative flex shrink-0 items-center justify-center overflow-hidden bg-mist ring-1 ring-line transition hover:ring-ink ${round ? "rounded-full" : "rounded-2xl"}`}
        style={{ width: size, height: size }} aria-label={kind === "escudo" ? "Subir escudo" : "Subir foto"}>
        {preview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={preview} alt="" className={`h-full w-full ${kind === "escudo" ? "object-contain p-2" : "object-cover"}`} />
          : fallback ?? <span className="text-[13px] font-semibold text-muted">Subir</span>}
        <span className={`absolute inset-0 flex items-center justify-center bg-black/55 text-[13px] font-semibold text-white transition-opacity ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {busy ? (compact ? "…" : "Subiendo…") : (compact ? "Foto" : "Cambiar")}
        </span>
      </button>
      {compact ? (error && <span className="text-[12px] text-loss">{error}</span>) : <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-4 !py-2 text-[14px]" disabled={busy} onClick={() => input.current?.click()}>
            {preview ? (kind === "escudo" ? "Cambiar escudo" : "Cambiar foto") : (kind === "escudo" ? "Subir escudo" : "Subir foto")}
          </button>
          {preview && (
            <button type="button" className="rounded-full px-3 py-2 text-[14px] font-semibold text-muted hover:text-loss" disabled={busy}
              onClick={() => { setPreview(null); startTransition(() => onSaved(null)); }}>
              Quitar
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">{kind === "escudo" ? "PNG con fondo transparente queda mejor." : "Se recorta cuadrada. Sirve una selfie."}</p>
        {error && <p className="text-[13px] font-medium text-loss">{error}</p>}
      </div>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
