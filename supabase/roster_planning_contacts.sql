begin;
-- Contato cadastral preservado fora dos metadados usados na autorização.
alter table public.user_registrations add column if not exists contato text
 check (contato is null or contato ~ '^[0-9]{10,11}$');
create or replace function private.capture_registration_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'contato',''),'\D','','g');
begin
 if phone<>'' and phone !~ '^[0-9]{10,11}$' then
  raise exception 'Informe um contato válido com DDD' using errcode='22023';
 end if;
 update public.user_registrations set contato=nullif(phone,'') where user_id=new.id;
 return new;
end;$$;
revoke all on function private.capture_registration_contact() from public,anon,authenticated;
create trigger zz_capture_registration_contact after insert on auth.users
 for each row execute function private.capture_registration_contact();

create table public.roster_people(
 id uuid primary key default gen_random_uuid(),
 staff_id uuid unique references public.staff(id),
 nome text not null check(length(btrim(nome)) between 2 and 160),
 posto_graduacao text not null check(length(btrim(posto_graduacao)) between 1 and 40),
 contato text check(contato is null or contato ~ '^[0-9]{10,11}$'),
 source_label text not null default '',
 version integer not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
insert into public.roster_people(staff_id,nome,posto_graduacao,source_label)
 select id,nome,posto_graduacao,'Efetivo DGSCI' from public.staff;
create table public.plantao_roster(
 id uuid primary key default gen_random_uuid(), service_date date not null unique,
 chief_id uuid not null references public.roster_people(id),
 assistant_id uuid not null references public.roster_people(id),
 expert_id uuid not null references public.roster_people(id),
 notes text not null default '' check(length(notes)<=4000),
 version integer not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
 check(chief_id<>assistant_id and chief_id<>expert_id and assistant_id<>expert_id)
);
create table public.roster_plans(
 month date primary key check(extract(day from month)=1),
 notes text not null default '' check(length(notes)<=12000),
 source_label text not null default '', source_updated text not null default '',
 version integer not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create table public.roster_plan_rows(
 id uuid primary key default gen_random_uuid(), month date not null references public.roster_plans(month),
 section text not null check(section in ('Chefe do Plantão','Aux. e Cond do Perito','Perito de Incêndio')),
 nome text not null check(length(btrim(nome)) between 2 and 160),
 posto_graduacao text not null check(length(btrim(posto_graduacao)) between 1 and 40),
 source_order integer not null default 0,
 name_color text not null default '#111111' check(name_color ~ '^#[0-9a-fA-F]{6}$'),
 cells jsonb not null default '{}' check(jsonb_typeof(cells)='object' and length(cells::text)<=20000),
 version integer not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create index roster_plan_rows_month_idx on public.roster_plan_rows(month);
-- As funções abaixo verificam a conta habilitada no banco, sem confiar em user_metadata.
create or replace function private.require_roster_manager() returns void
language plpgsql stable security invoker set search_path='' as $$begin
 if not exists(select 1 from public.app_members where user_id=(select auth.uid()) and enabled
 and sectors && array['Secretaria','Diretoria','Subdiretoria']) then
 raise exception 'Acesso restrito à Administração' using errcode='42501';end if;
end;$$;
revoke all on function private.require_roster_manager() from public,anon,authenticated;
grant execute on function private.require_roster_manager() to authenticated;
do $$declare t text;begin
 foreach t in array array['roster_people','plantao_roster','roster_plans','roster_plan_rows'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy roster_access on public.%I for all to authenticated using(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array[''Secretaria'',''Diretoria'',''Subdiretoria''])) with check(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array[''Secretaria'',''Diretoria'',''Subdiretoria'']))',t);
 execute format('create trigger stamp_roster before insert or update on public.%I for each row execute function private.stamp_roster()',t);
 end loop;
end$$;
create or replace function private.validate_plantao_team() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 if (select count(*) from public.roster_people p where p.id in(new.chief_id,new.assistant_id,new.expert_id)
 and upper(btrim(p.posto_graduacao))<>'VC')<>3 then
 raise exception 'Selecione três militares distintos para o plantão' using errcode='22023';end if;return new;
end;$$;
revoke all on function private.validate_plantao_team() from public,anon,authenticated;
create trigger validate_plantao_team before insert or update on public.plantao_roster
 for each row execute function private.validate_plantao_team();
create or replace function private.validate_planning_cells() returns trigger
language plpgsql security invoker set search_path='' as $$declare k text;v jsonb;d date;begin
 for k,v in select * from jsonb_each(new.cells) loop
  if k !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data inválida' using errcode='22023';end if;
  d:=k::date;
  if jsonb_typeof(v)<>'object' or jsonb_typeof(v->'value') is distinct from 'string' or d<new.month or d>new.month+interval '1 month 6 days' or length(coalesce(v->>'value',''))>20
  or coalesce(v->>'status','') not in ('','service_red','standby_red','service_black','standby_black','blocked','vacation','leave','operation','other')
  or coalesce(v->>'bg','#ffffff') !~ '^#[0-9a-fA-F]{6}$' or coalesce(v->>'fg','#000000') !~ '^#[0-9a-fA-F]{6}$'
  then raise exception 'Célula da previsão inválida' using errcode='22023';end if;
 end loop;return new;
end;$$;
revoke all on function private.validate_planning_cells() from public,anon,authenticated;
create trigger validate_planning_cells before insert or update on public.roster_plan_rows
 for each row execute function private.validate_planning_cells();
-- Busca somente o telefone do cadastro APROVADO, por CPF E matrícula exatos do efetivo.
-- SECURITY DEFINER é necessário para não conceder à Secretaria acesso aos demais cadastros.
create or replace function private.roster_people_with_contacts() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_roster_manager();
 return coalesce((select jsonb_agg(to_jsonb(t) order by nome) from(
  select p.*, coalesce(r.contato,p.contato) as resolved_contact,
   case when r.contato is not null then 'Cadastro aprovado' else p.source_label end as contact_source
  from public.roster_people p left join public.staff s on s.id=p.staff_id
  left join public.user_registrations r on r.status='approved' and r.contato is not null
   and regexp_replace(r.cpf,'\D','','g')=regexp_replace(s.cpf,'\D','','g')
   and regexp_replace(r.matricula,'[^0-9]','','g')<>''
   and regexp_replace(r.matricula,'[^0-9]','','g')=regexp_replace(s.mf,'[^0-9]','','g')
   and exists(select 1 from public.app_members m where m.user_id=r.user_id and m.enabled)
 )t),'[]'::jsonb);
end;$$;
revoke all on function private.roster_people_with_contacts() from public,anon,authenticated;
grant execute on function private.roster_people_with_contacts() to authenticated;
create function public.get_roster_people() returns jsonb language sql stable security invoker set search_path=''
 as $$select private.roster_people_with_contacts();$$;
revoke all on function public.get_roster_people() from public,anon,authenticated;
grant execute on function public.get_roster_people() to authenticated;
-- Inclui novos integrantes do efetivo, mantendo os contatos já cadastrados.
create or replace function private.sync_roster_person() returns trigger
language plpgsql security definer set search_path='' as $$begin
 insert into public.roster_people(staff_id,nome,posto_graduacao,source_label)
 values(new.id,new.nome,new.posto_graduacao,'Efetivo DGSCI') on conflict(staff_id) do update
 set nome=excluded.nome,posto_graduacao=excluded.posto_graduacao;
 return new;
end;$$;
revoke all on function private.sync_roster_person() from public,anon,authenticated;
create trigger sync_roster_person after insert or update of nome,posto_graduacao on public.staff
 for each row execute function private.sync_roster_person();
create or replace function private.list_managed_users() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user_manager();
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by
      case t.status when 'pending_approval' then 0 when 'approved' then 1 when 'blocked' then 2 else 3 end,
      t.created_at desc,
      lower(t.display_name)
    ) from (
      select
        coalesce(r.email, lower(u.email), a.email) as email,
        coalesce(r.nome, m.display_name, a.display_name) as display_name,
        coalesce(m.role, a.role, 'reader') as role,
        coalesce(m.sectors, a.sectors, '{}'::text[]) as sectors,
        coalesce(m.enabled, a.enabled, false) as enabled,
        coalesce(r.version, a.version, 1) as version,
        coalesce(r.updated_at, a.updated_at, now()) as updated_at,
        coalesce(r.created_at, u.created_at, now()) as created_at,
        coalesce(u.id, r.user_id) as user_id,
        u.last_sign_in_at,
        r.posto_graduacao,
        r.matricula,
        r.cpf,
        r.contato,
        r.data_nascimento,
        r.rejection_reason,
        r.approved_at,
        r.rejected_at,
        case
          when r.status is not null then r.status
          when not coalesce(m.enabled, a.enabled, false) then 'blocked'
          when u.id is null then 'pending_registration'
          else 'approved'
        end as status
      from (
        select distinct lower(email) as email from (
          select email from public.user_registrations
          union all
          select email from auth.users where deleted_at is null
          union all
          select email from private.login_allowlist
        ) all_emails
      ) e
      left join public.user_registrations r on lower(r.email) = e.email
      left join auth.users u on lower(u.email) = e.email and u.deleted_at is null
      left join public.app_members m on m.user_id = coalesce(u.id, r.user_id)
      left join private.login_allowlist a on a.email = e.email
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function private.set_roster_contact(p_id uuid,p_contato text,p_version integer) returns void
language plpgsql security definer set search_path='' as $$declare person public.roster_people%rowtype;begin
 perform private.require_roster_manager();
 if p_contato is null or p_contato !~ '^[0-9]{10,11}$' then raise exception 'Contato inválido' using errcode='22023';end if;
 select * into person from public.roster_people where id=p_id for update;
 if not found or p_version is null or person.version<>p_version then raise exception 'Registro alterado. Atualize a escala.' using errcode='40001';end if;
 update public.roster_people set contato=p_contato where id=p_id;
 update public.user_registrations r set contato=p_contato where r.status='approved'
 and exists(select 1 from public.app_members m where m.user_id=r.user_id and m.enabled)
 and exists(select 1 from public.staff s where s.id=person.staff_id
 and regexp_replace(r.cpf,'\D','','g')=regexp_replace(s.cpf,'\D','','g')
 and regexp_replace(r.matricula,'[^0-9]','','g')<>''
 and regexp_replace(r.matricula,'[^0-9]','','g')=regexp_replace(s.mf,'[^0-9]','','g'));
end;$$;
revoke all on function private.set_roster_contact(uuid,text,integer) from public,anon,authenticated;
grant execute on function private.set_roster_contact(uuid,text,integer) to authenticated;
create function public.set_roster_contact(p_id uuid,p_contato text,p_version integer) returns void
language sql security invoker set search_path='' as $$select private.set_roster_contact(p_id,p_contato,p_version);$$;
revoke all on function public.set_roster_contact(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.set_roster_contact(uuid,text,integer) to authenticated;
commit;
