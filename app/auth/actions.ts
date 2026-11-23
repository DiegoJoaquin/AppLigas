"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const msg = (path: string, key: "error" | "ok", text: string) =>
  `${path}?${key}=${encodeURIComponent(text)}`;

function translate(error: string) {
  if (/invalid login/i.test(error)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(error)) return "Debes confirmar tu correo antes de ingresar (revisa tu bandeja de entrada).";
  if (/already registered/i.test(error)) return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (/password/i.test(error)) return "La contraseña debe tener al menos 6 caracteres.";
  return error;
}

export async function signIn(formData: FormData) {
  const sb = await createClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(msg("/login", "error", translate(error.message)));
  // Cada uno llega a lo suyo: el admin a su panel, el jugador a sus números, el resto a la liga
  const { data: profile } = await sb.from("profiles").select("role, player_id").eq("id", data.user.id).maybeSingle();
  revalidatePath("/", "layout");
  redirect(profile?.role === "admin" ? "/admin" : profile?.player_id ? "/perfil" : "/");
}

export async function signUp(formData: FormData) {
  const sb = await createClient();
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { data, error } = await sb.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    options: {
      data: { full_name: String(formData.get("full_name") ?? "").trim() },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) redirect(msg("/registro", "error", translate(error.message)));
  if (!data.session) {
    redirect(msg("/login", "ok", "¡Cuenta creada! Te enviamos un correo para confirmarla. Después inicia sesión."));
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPlayerLink(formData: FormData) {
  const sb = await createClient();
  const playerId = String(formData.get("player_id") ?? "");
  if (!playerId) redirect(msg("/perfil", "error", "Elige tu nombre de la lista."));
  const { error } = await sb.rpc("request_player_link", { p_player: playerId });
  if (error) redirect(msg("/perfil", "error", error.message));
  revalidatePath("/perfil");
  redirect(msg("/perfil", "ok", "Solicitud enviada. Un administrador la aprobará pronto."));
}

export async function updateMyName(formData: FormData) {
  const sb = await createClient();
  await sb.rpc("update_my_name", { p_name: String(formData.get("full_name") ?? "") });
  revalidatePath("/perfil");
  redirect(msg("/perfil", "ok", "Datos actualizados."));
}

export async function setMyPhoto(url: string | null) {
  const sb = await createClient();
  const { error } = await sb.rpc("set_my_photo", { p_url: url ?? "" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
