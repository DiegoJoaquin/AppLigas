-- =====================================================================
--  LIGA SAN JOSÉ · Esquema de base de datos (Supabase / PostgreSQL)
--  Cómo usarlo: Supabase → SQL Editor → pega todo este archivo → Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  Tablas principales
-- ---------------------------------------------------------------------

create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                       -- ej: "Apertura 2026"
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  short_name    text,                               -- ej: "UNI"
  color         text not null default '#1d4ed8',    -- color del club (hex)
  logo_url      text,
  sofascore_id  bigint unique,
  created_at    timestamptz not null default now()
);

create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid references public.teams(id) on delete set null,
  full_name     text not null,
  number        int,
  position      text check (position in ('Arquero','Defensa','Mediocampista','Delantero')),
  photo_url     text,
  sofascore_id  bigint unique,
  created_at    timestamptz not null default now()
);
create index if not exists players_team_idx on public.players(team_id);

create table if not exists public.matchdays (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons(id) on delete cascade,
  number      int not null,
  name        text,                                 -- ej: "Fecha 3"
  date        date,
  created_at  timestamptz not null default now(),
  unique (season_id, number)
);

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  matchday_id   uuid not null references public.matchdays(id) on delete cascade,
  home_team_id  uuid not null references public.teams(id),
  away_team_id  uuid not null references public.teams(id),
  kickoff       timestamptz,
  venue         text,
  status        text not null default 'programado'
                check (status in ('programado','en_juego','finalizado','suspendido')),
  home_score    int check (home_score >= 0),
  away_score    int check (away_score >= 0),
  sofascore_id  bigint unique,
  notes         text,
  created_at    timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index if not exists matches_matchday_idx on public.matches(matchday_id);

-- Goles, tarjetas, asistencias
create table if not exists public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  team_id     uuid not null references public.teams(id),
  player_id   uuid references public.players(id) on delete set null,
  type        text not null check (type in ('gol','penal','autogol','asistencia','amarilla','roja')),
  minute      int check (minute between 0 and 130),
  created_at  timestamptz not null default now()
);
create index if not exists events_match_idx  on public.match_events(match_id);
create index if not exists events_player_idx on public.match_events(player_id);

-- Quién jugó cada partido (para "partidos jugados")
create table if not exists public.appearances (
  match_id   uuid not null references public.matches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  team_id    uuid not null references public.teams(id),
  primary key (match_id, player_id)
);

-- Perfil de cada usuario registrado
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  full_name            text,
  role                 text not null default 'fan' check (role in ('admin','jugador','fan')),
  player_id            uuid unique references public.players(id) on delete set null,  -- vínculo aprobado
  requested_player_id  uuid references public.players(id) on delete set null,         -- solicitud pendiente
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Funciones auxiliares
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- El usuario solicita vincularse a un jugador (lo aprueba un admin)
create or replace function public.request_player_link(p_player uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from public.profiles where player_id = p_player) then
    raise exception 'Ese jugador ya está vinculado a otra cuenta';
  end if;
  update public.profiles set requested_player_id = p_player where id = auth.uid();
end $$;

create or replace function public.update_my_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set full_name = left(trim(p_name), 80) where id = auth.uid();
end $$;

-- El admin aprueba o rechaza una solicitud
create or replace function public.resolve_player_link(p_profile uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if p_approve then
    update public.profiles
       set player_id = requested_player_id,
           requested_player_id = null,
           role = case when role = 'admin' then 'admin' else 'jugador' end
     where id = p_profile and requested_player_id is not null;
  else
    update public.profiles set requested_player_id = null where id = p_profile;
  end if;
end $$;

-- ---------------------------------------------------------------------
--  Vistas de estadísticas
-- ---------------------------------------------------------------------

-- Tabla de posiciones por temporada
create or replace view public.standings with (security_invoker = true) as
with res as (
  select md.season_id, m.home_team_id as team_id, m.home_score as gf, m.away_score as gc
    from public.matches m join public.matchdays md on md.id = m.matchday_id
   where m.status = 'finalizado' and m.home_score is not null and m.away_score is not null
  union all
  select md.season_id, m.away_team_id, m.away_score, m.home_score
    from public.matches m join public.matchdays md on md.id = m.matchday_id
   where m.status = 'finalizado' and m.home_score is not null and m.away_score is not null
)
select r.season_id, t.id as team_id, t.name, t.short_name, t.color, t.logo_url,
       count(*)::int                                   as pj,
       count(*) filter (where gf > gc)::int            as pg,
       count(*) filter (where gf = gc)::int            as pe,
       count(*) filter (where gf < gc)::int            as pp,
       sum(gf)::int                                    as gf,
       sum(gc)::int                                    as gc,
       (sum(gf) - sum(gc))::int                        as dg,
       (count(*) filter (where gf > gc) * 3 + count(*) filter (where gf = gc))::int as pts
  from res r join public.teams t on t.id = r.team_id
 group by r.season_id, t.id;

-- Estadísticas por jugador y temporada
create or replace view public.player_stats with (security_invoker = true) as
with ev as (
  select md.season_id, e.player_id,
         count(*) filter (where e.type in ('gol','penal'))  as goles,
         count(*) filter (where e.type = 'asistencia')      as asistencias,
         count(*) filter (where e.type = 'amarilla')        as amarillas,
         count(*) filter (where e.type = 'roja')            as rojas
    from public.match_events e
    join public.matches m   on m.id = e.match_id
    join public.matchdays md on md.id = m.matchday_id
   where e.player_id is not null
   group by md.season_id, e.player_id
), ap as (
  select md.season_id, a.player_id, count(*) as pj
    from public.appearances a
    join public.matches m   on m.id = a.match_id
    join public.matchdays md on md.id = m.matchday_id
   group by md.season_id, a.player_id
)
select coalesce(ev.season_id, ap.season_id) as season_id,
       p.id as player_id, p.full_name, p.number, p.position, p.photo_url,
       t.id as team_id, t.name as team_name, t.color as team_color,
       coalesce(ap.pj, 0)::int          as pj,
       coalesce(ev.goles, 0)::int       as goles,
       coalesce(ev.asistencias, 0)::int as asistencias,
       coalesce(ev.amarillas, 0)::int   as amarillas,
       coalesce(ev.rojas, 0)::int       as rojas
  from ev full outer join ap on ap.player_id = ev.player_id and ap.season_id = ev.season_id
  join public.players p on p.id = coalesce(ev.player_id, ap.player_id)
  left join public.teams t on t.id = p.team_id;

-- ---------------------------------------------------------------------
--  Seguridad (Row Level Security)
--  Todos pueden VER la liga; solo los admin pueden MODIFICARLA.
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['seasons','teams','players','matchdays','matches','match_events','appearances'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "lectura publica" on public.%I', t);
    execute format('create policy "lectura publica" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin escribe" on public.%I', t);
    execute format('create policy "admin escribe" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "ver mi perfil" on public.profiles;
create policy "ver mi perfil" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "admin edita perfiles" on public.profiles;
create policy "admin edita perfiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

grant select on public.standings, public.player_stats to anon, authenticated;
grant execute on function public.request_player_link(uuid), public.update_my_name(text),
                          public.resolve_player_link(uuid, boolean), public.is_admin() to authenticated;

-- =====================================================================
--  v2: fotos, marcador automático, árbitro y actualización en vivo
-- =====================================================================

alter table public.matches add column if not exists referee text;

-- Jugador vinculado a la cuenta actual
create or replace function public.my_player_id()
returns uuid language sql stable security definer set search_path = public as $$
  select player_id from public.profiles where id = auth.uid();
$$;

-- El jugador cambia su propia foto
create or replace function public.set_my_photo(p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid := public.my_player_id();
begin
  if pid is null then raise exception 'Tu cuenta no está vinculada a un jugador'; end if;
  update public.players set photo_url = nullif(trim(p_url), '') where id = pid;
end $$;
grant execute on function public.my_player_id(), public.set_my_photo(text) to authenticated;

-- Marcador automático: cuando se cargan o borran goles, el marcador se recalcula solo
create or replace function public.sync_match_score()
returns trigger language plpgsql security definer set search_path = public as $$
declare mid uuid := coalesce(new.match_id, old.match_id);
begin
  if coalesce(new.type, old.type) not in ('gol','penal','autogol')
     and (tg_op <> 'UPDATE' or old.type not in ('gol','penal','autogol')) then
    return null;
  end if;
  update public.matches m set
    home_score = (select count(*) from public.match_events e where e.match_id = mid and e.team_id = m.home_team_id and e.type in ('gol','penal','autogol')),
    away_score = (select count(*) from public.match_events e where e.match_id = mid and e.team_id = m.away_team_id and e.type in ('gol','penal','autogol')),
    status = case when m.status = 'programado' then 'en_juego' else m.status end
  where m.id = mid;
  return null;
end $$;

drop trigger if exists match_events_score on public.match_events;
create trigger match_events_score
  after insert or update or delete on public.match_events
  for each row execute function public.sync_match_score();

-- Fotos (Supabase Storage): bucket público "fotos"
--   escudos/<team_id>.webp   → solo admin
--   jugadores/<player_id>.webp → admin o el mismo jugador
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('fotos', 'fotos', true, 2097152, array['image/webp','image/jpeg','image/png'])
    on conflict (id) do update set public = true, file_size_limit = 2097152;

    drop policy if exists "fotos lectura" on storage.objects;
    create policy "fotos lectura" on storage.objects for select using (bucket_id = 'fotos');

    drop policy if exists "fotos admin" on storage.objects;
    create policy "fotos admin" on storage.objects for all to authenticated
      using (bucket_id = 'fotos' and public.is_admin())
      with check (bucket_id = 'fotos' and public.is_admin());

    drop policy if exists "fotos jugador sube" on storage.objects;
    create policy "fotos jugador sube" on storage.objects for insert to authenticated
      with check (bucket_id = 'fotos' and name like 'jugadores/' || public.my_player_id()::text || '%');
    drop policy if exists "fotos jugador cambia" on storage.objects;
    create policy "fotos jugador cambia" on storage.objects for update to authenticated
      using (bucket_id = 'fotos' and name like 'jugadores/' || public.my_player_id()::text || '%');
  end if;
end $$;

-- Actualización en vivo: la web se refresca sola cuando cambian partidos o incidencias
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.match_events; exception when duplicate_object then null; end;
  end if;
end $$;
