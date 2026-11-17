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
