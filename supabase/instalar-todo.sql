-- =====================================================================
-- GeoCam ve · INSTALACIÓN COMPLETA en Supabase (Semanas 8 + 9 + 10)
-- Pegar TODO en Dashboard > SQL Editor > New query > Run. Una sola vez.
-- =====================================================================

-- 0) Quitar lo del ejercicio anterior. Las tablas photos/albums solo tenian datos de prueba
--    (se borran). El bucket "photos" ya esta vacio: se vuelve privado y sin acceso anonimo.
update storage.buckets set public = false where id = 'photos';
drop policy if exists "anon read photos bucket" on storage.objects;
drop policy if exists "anon upload photos bucket" on storage.objects;
drop policy if exists "anon delete photos bucket" on storage.objects;
drop table if exists public.photos cascade;
drop table if exists public.albums cascade;

-- ===================== 1) Semana 8 · schema.sql =====================
-- GeoCam en la nube · Semana 8 (T3)
-- Ejecutar una sola vez en el SQL Editor del proyecto de Supabase.

create table public.photos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null unique,      -- UUID creado en el teléfono: identifica la misma foto en ambos lados
  storage_path text not null unique,
  latitude double precision,
  longitude double precision,
  note text,
  favorite boolean not null default false,
  source text not null check (source in ('camera', 'gallery')),
  taken_at timestamptz not null,
  updated_at timestamptz not null,     -- última modificación hecha por el usuario (base de la Semana 9)
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

-- Cada usuario solo ve, crea y borra sus propias filas
create policy "ver las mías" on public.photos
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "crear las mías" on public.photos
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "borrar las mías" on public.photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Bucket privado: sin política de lectura nadie puede ver los archivos
insert into storage.buckets (id, name, public) values ('geocam', 'geocam', false);

create policy "subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "leer mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- ===================== 2) Semana 9 · semana9.sql ====================
-- GeoCam sincronizada · Semana 9 (T1)
-- Ejecutar DESPUÉS de schema.sql (Semana 8), una sola vez, en el SQL Editor.

-- Reloj del servidor: cuándo llegó cada cambio a Supabase (cursor de bajada)
alter table public.photos
  add column server_updated_at timestamptz not null default now();

create or replace function public.touch_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

create trigger photos_touch_server_updated_at
  before insert or update on public.photos
  for each row execute function public.touch_server_updated_at();

create index photos_user_server_updated_idx
  on public.photos (user_id, server_updated_at);

-- upsert necesita permiso de actualizar, además de insertar y leer
create policy "editar las mías" on public.photos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ===================== 3) Semana 10 · semana10.sql ==================
-- GeoCam ve · Semana 10
-- Ejecutar DESPUÉS de schema.sql (Semana 8) y semana9.sql, una sola vez, en el SQL Editor.

-- T3 · Descripción generada por IA (y editada por el usuario). Viaja con la sincronización.
alter table public.photos add column if not exists ai_description text;

-- Límite diario de peticiones de IA por usuario (lo usa la Edge Function describir-foto).
-- Se cuenta con el cliente DEL USUARIO (RLS), no con la secret key.
create table if not exists public.uso_ia (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  funcion    text not null check (funcion in ('tutor', 'tarjetas', 'describir-foto')),
  created_at timestamptz not null default now()
);

create index if not exists uso_ia_user_fecha_idx on public.uso_ia (user_id, created_at desc);

alter table public.uso_ia enable row level security;

drop policy if exists "uso_ia: ver lo propio" on public.uso_ia;
create policy "uso_ia: ver lo propio"
  on public.uso_ia for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "uso_ia: insertar lo propio" on public.uso_ia;
create policy "uso_ia: insertar lo propio"
  on public.uso_ia for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin UPDATE ni DELETE: nadie puede borrar su historial para "reiniciar" el límite.
revoke update, delete on public.uso_ia from anon, authenticated;
