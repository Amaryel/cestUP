-- Controle de Cestas: tabela de sincronização com segurança por usuário (RLS).
-- Cole este arquivo inteiro no SQL Editor do projeto Supabase e execute.
-- É seguro rodar mais de uma vez. Não mexe em nenhuma outra tabela do projeto.

create table if not exists public.controle_cestas_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  rev        bigint not null default 1,
  device     text,
  updated_at timestamptz not null default now(),
  constraint controle_cestas_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint controle_cestas_state_max_size  check (pg_column_size(state) <= 2097152)
);

comment on table public.controle_cestas_state is
  'Um registro por usuário com todo o estado do app Controle de Cestas ({v:1,state}). rev controla conflitos entre aparelhos.';

-- Segurança: cada usuário só enxerga e altera a própria linha. Visitante (anon) não acessa nada.
alter table public.controle_cestas_state enable row level security;
alter table public.controle_cestas_state force row level security;

revoke all on table public.controle_cestas_state from public, anon;
grant select, insert, update, delete on table public.controle_cestas_state to authenticated;

drop policy if exists controle_cestas_select on public.controle_cestas_state;
drop policy if exists controle_cestas_insert on public.controle_cestas_state;
drop policy if exists controle_cestas_update on public.controle_cestas_state;
drop policy if exists controle_cestas_delete on public.controle_cestas_state;

create policy controle_cestas_select on public.controle_cestas_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy controle_cestas_insert on public.controle_cestas_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy controle_cestas_update on public.controle_cestas_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy controle_cestas_delete on public.controle_cestas_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- O servidor (e não o app) controla a revisão e a data: o app não consegue forjar nem pular revisões.
create or replace function public.controle_cestas_touch()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.rev := 1;
  else
    new.user_id := old.user_id;
    new.rev := old.rev + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.controle_cestas_touch() from public, anon, authenticated;

drop trigger if exists controle_cestas_touch on public.controle_cestas_state;
create trigger controle_cestas_touch
  before insert or update on public.controle_cestas_state
  for each row execute function public.controle_cestas_touch();

-- ---------------------------------------------------------------------------
-- AUDITORIA (só leitura, opcional): tabelas do projeto SEM RLS ligado.
-- Qualquer tabela listada aqui pode ser lida/alterada por quem tiver a chave pública.
-- select schemaname, tablename from pg_tables
--  where schemaname = 'public' and not rowsecurity order by 2;
-- ---------------------------------------------------------------------------
