-- =====================================================================
--  DATOS DE EJEMPLO (opcional) — para ver la plataforma funcionando.
--  Ejecútalo DESPUÉS de schema.sql. Bórralos cuando cargues la liga real:
--    delete from public.seasons; delete from public.players; delete from public.teams;
-- =====================================================================

insert into public.seasons (name, is_current) values ('Apertura 2026', true);

insert into public.teams (name, short_name, color) values
  ('Deportivo San José', 'DSJ', '#1d4ed8'),
  ('Unión Los Aromos',   'ULA', '#dc2626'),
  ('Atlético Villa Sur', 'AVS', '#16a34a'),
  ('Real Población',     'RPO', '#7c3aed'),
  ('Juventud Esperanza', 'JUV', '#ea580c'),
  ('Club Estrella Roja', 'CER', '#be123c'),
  ('Halcones FC',        'HAL', '#0f766e'),
  ('Sporting Las Rosas', 'SLR', '#ca8a04');

-- 14 jugadores por equipo
do $$
declare
  t record; i int;
  nombres text[] := array['Matías','Benjamín','Vicente','Martín','Joaquín','Tomás','Diego','Lucas','Agustín','Felipe','Cristóbal','Sebastián','Nicolás','Ignacio','Bastián','Maximiliano','Gaspar','Francisco','Rodrigo','Javier'];
  apellidos text[] := array['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Rodríguez','López','Fuentes','Hernández','Torres','Araya','Flores','Espinoza','Valenzuela','Castillo','Tapia','Reyes','Gutiérrez','Castro','Pizarro','Álvarez','Vásquez','Sánchez','Fernández'];
  pos text;
  k int := 0;
begin
  for t in select id from public.teams order by name loop
    for i in 1..14 loop
      k := k + 1;
      pos := case when i = 1 then 'Arquero' when i <= 5 then 'Defensa' when i <= 10 then 'Mediocampista' else 'Delantero' end;
      insert into public.players (team_id, full_name, number, position)
      values (t.id, nombres[1 + (k * 7) % 20] || ' ' || apellidos[1 + (k * 11) % 30], i, pos);
    end loop;
  end loop;
end $$;

-- 7 fechas (todos contra todos). Las 3 primeras ya jugadas, con goles y tarjetas.
do $$
declare
  season uuid := (select id from public.seasons where is_current limit 1);
  teams uuid[] := array(select id from public.teams order by name);
  n int := 8; r int; i int; h uuid; a uuid; md uuid; m uuid;
  rot uuid[]; hs int; aws int; g int; p uuid;
  base date := date '2026-10-10';
begin
  rot := teams;
  for r in 1..7 loop
    insert into public.matchdays (season_id, number, name, date)
    values (season, r, 'Fecha ' || r, base + (r - 1) * 7) returning id into md;
    for i in 1..n/2 loop
      if r % 2 = 0 then h := rot[i]; a := rot[n + 1 - i]; else h := rot[n + 1 - i]; a := rot[i]; end if;
      if r <= 3 then
        hs := (abs(hashtext(r::text || i::text || 'h')) % 4);
        aws := (abs(hashtext(r::text || i::text || 'a')) % 3);
        insert into public.matches (matchday_id, home_team_id, away_team_id, kickoff, venue, status, home_score, away_score)
        values (md, h, a, (base + (r - 1) * 7 + 1) + make_interval(hours => 9 + i * 2), 'Cancha ' || i, 'finalizado', hs, aws)
        returning id into m;
        -- titulares: 11 por lado
        insert into public.appearances (match_id, player_id, team_id)
        select m, id, team_id from public.players where team_id in (h, a) and number <= 11;
        -- goles
        for g in 1..hs loop
          select id into p from public.players where team_id = h and number > 5 order by random() limit 1;
          insert into public.match_events (match_id, team_id, player_id, type, minute) values (m, h, p, 'gol', 5 + (abs(hashtext(m::text || g)) % 85));
        end loop;
        for g in 1..aws loop
          select id into p from public.players where team_id = a and number > 5 order by random() limit 1;
          insert into public.match_events (match_id, team_id, player_id, type, minute) values (m, a, p, 'gol', 5 + (abs(hashtext(m::text || g || 'x')) % 85));
        end loop;
        -- una amarilla por lado
        select id into p from public.players where team_id = h and number between 2 and 8 order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, type, minute) values (m, h, p, 'amarilla', 40);
        select id into p from public.players where team_id = a and number between 2 and 8 order by random() limit 1;
        insert into public.match_events (match_id, team_id, player_id, type, minute) values (m, a, p, 'amarilla', 67);
      else
        insert into public.matches (matchday_id, home_team_id, away_team_id, kickoff, venue, status)
        values (md, h, a, (base + (r - 1) * 7 + 1) + make_interval(hours => 9 + i * 2), 'Cancha ' || i, 'programado');
      end if;
    end loop;
    -- rotación (método del círculo): el primero queda fijo
    rot := array[rot[1], rot[n]] || rot[2:n-1];
  end loop;
end $$;

-- asistencias (~60% de los goles) y algunas rojas
insert into public.match_events (match_id, team_id, player_id, type, minute)
select g.match_id, g.team_id,
       (select p.id from public.players p where p.team_id = g.team_id and p.id <> g.player_id and p.number between 2 and 11 order by random() limit 1),
       'asistencia', g.minute
  from public.match_events g
 where g.type = 'gol' and random() < 0.6;

insert into public.match_events (match_id, team_id, player_id, type, minute)
select m.id, m.away_team_id,
       (select p.id from public.players p where p.team_id = m.away_team_id and p.number between 2 and 5 order by random() limit 1),
       'roja', 81
  from public.matches m where m.status = 'finalizado' and random() < 0.2;
