# Dscore · Liga San José

**Dscore** es la web de la liga: fixture por fechas, resultados, tabla de posiciones, goleadores, fichas de equipos y jugadores,
cuentas de usuario (hinchas y jugadores) y panel de administración. **Todo con planes gratuitos.**

| Pieza | Servicio | Costo |
|---|---|---|
| Base de datos + login | Supabase (plan Free) | $0 |
| Web pública | Vercel (plan Hobby) | $0 |
| Código | GitHub | $0 |

---

## 1. Crear la base de datos (Supabase) — 5 min

1. Entra a <https://supabase.com> → **Start your project** → crea una cuenta (puede ser con GitHub).
2. **New project** → nombre `liga-san-jose`, región **South America (São Paulo)** (la web en Vercel también corre en São Paulo; si eliges otra región en Supabase, cambia `vercel.json` para que coincidan), inventa una contraseña y guárdala.
3. Menú izquierdo → **SQL Editor** → **New query** → pega TODO el contenido de `supabase/schema.sql` → **Run**.
4. (Opcional, para ver la web con datos de prueba) Nueva query → pega `supabase/seed.sql` → **Run**.
5. **Authentication → Sign In / Providers → Email**: déjalo activado y **desactiva *Confirm email*** → Save. Así las cuentas quedan listas al registrarse, sin correo de confirmación.
6. **Project Settings → API** (o *Data API*): copia **Project URL** y la **anon public key**.

## 2. Probar en tu computador (opcional)

Requiere Node.js 20 o superior (<https://nodejs.org>).

```bash
cd liga-san-jose
copy .env.example .env.local     # en Mac/Linux: cp .env.example .env.local
# edita .env.local y pega la URL y la anon key
npm install
npm run dev
```

Abre <http://localhost:3000>.

## 3. Publicarla gratis en internet (Vercel)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a <https://vercel.com> con tu cuenta de GitHub → **Add New → Project** → elige el repo.
3. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = la URL que te dé Vercel (ej. `https://liga-san-jose.vercel.app`)
4. **Deploy**. Listo: te queda una URL tipo `liga-san-jose.vercel.app`.
5. En Supabase → **Authentication → URL Configuration** pon esa misma URL en **Site URL** y agrega
   `https://TU-URL.vercel.app/auth/callback` en **Redirect URLs**.

## 4. Hacerte administrador

1. Regístrate en la web con tu correo.
2. En Supabase → SQL Editor ejecuta (cambiando el correo):

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@gmail.com';
```

Ahora verás el botón **Admin** arriba. Desde ahí puedes nombrar a otros administradores (por ejemplo tu amigo) en **Usuarios**.

## 5. Uso del día a día

**Al empezar la temporada**
- *Admin → Resumen*: crea la temporada (ej. "Apertura 2027").
- *Admin → Equipos y jugadores*: crea los equipos. En cada equipo puedes **pegar la lista completa de jugadores** (una línea por jugador: `10, Juan Pérez, Delantero`).
- *Admin → Fechas y partidos*: **Generar fixture automático** (todos contra todos, una rueda o ida y vuelta) y luego ajusta horarios y canchas.

**Durante el partido (desde el celular)**
- *Admin → Fechas y partidos → Detalle y goles* del partido → **Empezar partido**.
- **Carga rápida**: eliges el jugador y tocas Gol, Asist., Penal, Amarilla o Roja. El marcador suma solo.
- La web pública (inicio, fecha, partido, tabla) se actualiza sola, sin recargar.
- Al final: **Terminar partido**.

**Cada fin de semana**
- *Admin → Fechas y partidos*: escribe los marcadores de la fecha y **Guardar resultados** (todos de una vez). La tabla se actualiza sola.
- Para goles, tarjetas y quién jugó: botón **Detalle / goles** de cada partido.
- O pega el link de Sofascore en **Importar desde Sofascore** (ver abajo).

**Fotos**
- Escudos: *Admin → Equipos y jugadores → (equipo) → Subir escudo*.
- Fotos de jugadores: el admin desde el plantel, o cada jugador desde *Mi cuenta* (solo puede cambiar la suya).
- Las imágenes se achican y convierten a WebP en el mismo celular antes de subirse (una foto de 3 MB queda en unos 30–60 KB), así el plan gratis de Supabase (1 GB) alcanza para miles.

**Jugadores**
- Se registran, van a *Mi cuenta* y eligen su nombre → **Soy yo**.
- El admin aprueba la solicitud en *Admin → Resumen*. Desde ahí el jugador ve sus goles, partidos, asistencias y tarjetas.
- Quien no es jugador simplemente ve la liga como hincha.

## 6. Sobre Sofascore

Sofascore **no ofrece una API oficial ni gratuita** para conectar sistemas externos. La plataforma incluye un
importador que lee los mismos datos públicos que muestra la web de Sofascore: pegas el link de un partido
(el que termina en `#id:12345678`) y trae marcador, goles, asistencias y tarjetas, emparejando los nombres con
tu plantel.

Ten en cuenta:
- Al no ser oficial, puede fallar si Sofascore bloquea la petición o cambia su formato. Si falla, se carga a mano en 1 minuto.
- Los nombres deben parecerse a los de tu plantel; el sistema avisa cuáles no calzaron.
- **Recomendación:** usar esta plataforma como el registro principal (es igual de rápido que Sofascore) y dejar Sofascore solo si quieren seguir publicando ahí también.

## Estructura

```
app/                 páginas (inicio, fechas, tabla, estadísticas, equipos, jugadores, login, perfil)
app/admin/           panel de administración + acciones (guardar, borrar, importar)
components/          piezas visuales reutilizables
lib/                 consultas a la base de datos, formato de fechas, importador Sofascore
supabase/schema.sql  tablas, seguridad (RLS), vistas de tabla y estadísticas
supabase/seed.sql    datos de ejemplo
```

**Seguridad:** cualquiera puede *ver* la liga; solo los administradores pueden *modificarla* (reglas RLS en la base de datos, no solo en la web). Los jugadores solo pueden pedir vincularse a su ficha; el admin aprueba.

## Cambiar el nombre o los colores

- Nombre de la app y de la liga: `lib/brand.ts`.
- Colores y tipografías: `app/globals.css` (bloque `@theme`).
