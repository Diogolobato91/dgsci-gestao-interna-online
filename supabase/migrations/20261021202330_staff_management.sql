begin;
alter table public.staff add column version integer not null default 1,
 add column updated_by uuid references auth.users(id);
create trigger stamp_staff before insert or update on public.staff
 for each row execute function private.stamp_roster();
create unique index staff_cpf_unique on public.staff((regexp_replace(cpf,'\D','','g')))
 where nullif(regexp_replace(cpf,'\D','','g'),'') is not null;
create unique index staff_mf_unique on public.staff((regexp_replace(mf,'[^0-9]','','g')))
 where nullif(regexp_replace(mf,'[^0-9]','','g'),'') is not null;
-- Cadastro editado exclusivamente por operação validada; consulta continua com RLS.
revoke insert,update,delete on public.staff from authenticated,anon;
revoke insert,update,delete on public.roster_people from authenticated,anon;
drop policy if exists staff_admin_update on public.staff;
drop policy if exists staff_sector_read on public.staff;
create policy staff_sector_read on public.staff for select to authenticated using(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create table public.staff_absences(
 id uuid primary key default gen_random_uuid(), staff_id uuid not null references public.staff(id),
 kind text not null check(kind in ('Férias','Licença','Afastamento')),
 starts_on date not null check(starts_on>='1900-01-01'),
 ends_on date not null check(ends_on>=starts_on),
 reason text not null default '' check(length(reason)<=1000),
 cancelled_at timestamptz, cancelled_by uuid references auth.users(id),
 cancellation_reason text not null default '' check(length(cancellation_reason)<=500),
 version integer not null default 1,
 created_at timestamptz not null default now(), created_by uuid references auth.users(id),
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
create index staff_absences_period_idx on public.staff_absences(staff_id,starts_on,ends_on) where cancelled_at is null;
alter table public.staff_absences enable row level security;
revoke all on public.staff_absences from public,anon,authenticated;
grant select,insert,update on public.staff_absences to authenticated;
create policy absences_read on public.staff_absences for select to authenticated using(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy absences_insert on public.staff_absences for insert to authenticated with check(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create policy absences_update on public.staff_absences for update to authenticated using(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])) with check(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria']));
create function private.validate_staff_absence() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('dgsci-staff-availability:'||new.staff_id::text,0));
 if tg_op='UPDATE' then
  if new.staff_id<>old.staff_id then raise exception 'O integrante do registro não pode ser alterado' using errcode='22023';end if;
  if old.cancelled_at is not null then raise exception 'Um afastamento cancelado não pode ser editado' using errcode='22023';end if;
  new.version:=old.version+1;new.created_at:=old.created_at;new.created_by:=old.created_by;
  if new.cancelled_at is not null then
   if length(btrim(new.cancellation_reason))<3 then raise exception 'Informe o motivo do cancelamento' using errcode='22023';end if;
   new.cancelled_at:=clock_timestamp();new.cancelled_by:=auth.uid();
   new.starts_on:=old.starts_on;new.ends_on:=old.ends_on;new.kind:=old.kind;new.reason:=old.reason;
  else new.cancelled_by:=null;new.cancellation_reason:='';end if;
 else
  new.version:=1;new.created_at:=clock_timestamp();new.created_by:=auth.uid();
  new.cancelled_at:=null;new.cancelled_by:=null;new.cancellation_reason:='';
 end if;
 if new.cancelled_at is null and exists(select 1 from public.staff_absences a
 where a.staff_id=new.staff_id and a.cancelled_at is null and a.id<>new.id
 and a.starts_on<=new.ends_on and a.ends_on>=new.starts_on) then
 raise exception 'Já existe um afastamento nesse período. Confira o histórico do integrante.' using errcode='22023';end if;
 new.updated_at:=clock_timestamp();new.updated_by:=auth.uid();return new;
end;$$;
revoke all on function private.validate_staff_absence() from public,anon,authenticated;
create trigger validate_staff_absence before insert or update on public.staff_absences
 for each row execute function private.validate_staff_absence();
create function private.guard_plantao_availability() returns trigger language plpgsql security invoker set search_path='' as $$
declare member_id uuid;begin
 for member_id in select distinct p.staff_id from public.roster_people p
 where p.id in(new.chief_id,new.assistant_id,new.expert_id) and p.staff_id is not null order by p.staff_id loop
  perform pg_advisory_xact_lock(hashtextextended('dgsci-staff-availability:'||member_id::text,0));
 end loop;
 if exists(select 1 from public.staff_absences a join public.roster_people p on p.staff_id=a.staff_id
 where p.id in(new.chief_id,new.assistant_id,new.expert_id) and a.cancelled_at is null
 and new.service_date between a.starts_on and a.ends_on) then
 raise exception 'Há militar afastado na data do plantão. Atualize a disponibilidade e revise a equipe.' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.guard_plantao_availability() from public,anon,authenticated;
create trigger guard_plantao_availability before insert or update on public.plantao_roster
 for each row execute function private.guard_plantao_availability();

-- Permite limpar um telefone, sincronizando somente o cadastro aprovado vinculado.
create or replace function private.set_roster_contact(p_id uuid,p_contato text,p_version integer) returns void
language plpgsql security definer set search_path='' as $$declare person public.roster_people%rowtype;begin
 perform private.require_roster_manager();
 if p_contato is not null and p_contato !~ '^[0-9]{10,11}$' then raise exception 'Contato inválido' using errcode='22023';end if;
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

create function private.save_staff_member(p_id uuid,p_version integer,p_nome text,p_rank text,p_mf text,p_cpf text,p_birth date,p_contact text) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.staff%rowtype;person public.roster_people%rowtype;target uuid:=coalesce(p_id,gen_random_uuid());
 clean_cpf text:=nullif(regexp_replace(coalesce(p_cpf,''),'\D','','g'),'');
 clean_mf text:=nullif(btrim(p_mf),'');phone text:=nullif(regexp_replace(coalesce(p_contact,''),'\D','','g'),'');
begin
 perform private.require_roster_manager();
 if p_id is not null then
  perform pg_advisory_xact_lock(hashtextextended('dgsci-staff-availability:'||p_id::text,0));
  select * into previous from public.staff where id=p_id for update;
  if not found or p_version is null or p_version<>previous.version then raise exception 'Cadastro alterado. Atualize a relação de efetivo.' using errcode='40001';end if;
 end if;
 if p_nome is null or length(btrim(p_nome)) not between 2 and 160 or p_rank is null
 or p_rank<>all(array['CEL','TCEL','MAJ','CAP','1º TEN','2º TEN','SUB TEN RR','SUB TEN','1º SGT','2º SGT','3º SGT','CB','SD','VC']) then
 raise exception 'Confira o nome e o posto ou graduação' using errcode='22023';end if;
 if clean_mf is not null and (length(clean_mf) not between 2 and 50 or regexp_replace(clean_mf,'[^0-9]','','g')='') then raise exception 'Matrícula inválida' using errcode='22023';end if;
 if clean_cpf is not null and clean_cpf is distinct from nullif(regexp_replace(previous.cpf,'\D','','g'),'') and not private.is_valid_cpf(clean_cpf) then raise exception 'CPF inválido' using errcode='22023';end if;
 if p_birth is not null and (p_birth<'1900-01-01' or p_birth>(now() at time zone 'America/Belem')::date) then raise exception 'Data de nascimento inválida' using errcode='22023';end if;
 if phone is not null and phone !~ '^[0-9]{10,11}$' then raise exception 'Contato inválido. Informe DDD e telefone.' using errcode='22023';end if;
 if p_rank='VC' and p_id is not null and exists(select 1 from public.plantao_roster r join public.roster_people p on p.id in(r.chief_id,r.assistant_id,r.expert_id)
 where p.staff_id=p_id and r.service_date>=(now() at time zone 'America/Belem')::date) then
 raise exception 'Revise os plantões futuros antes de alterar a graduação para VC.' using errcode='22023';end if;
 begin
  if p_id is null then
   insert into public.staff(id,source_key,source_order,posto_graduacao,nome,mf,cpf,data_nascimento,categoria)
   values(target,'manual:'||target::text,(select coalesce(max(source_order),0)+1 from public.staff),p_rank,btrim(p_nome),clean_mf,clean_cpf,p_birth,case when p_rank='VC' then 'Voluntário civil' else 'Militar' end);
  else
   update public.staff set nome=btrim(p_nome),posto_graduacao=p_rank,mf=clean_mf,cpf=clean_cpf,data_nascimento=p_birth,
   categoria=case when p_rank='VC' then 'Voluntário civil' else 'Militar' end where id=target;
  end if;
 exception when unique_violation then raise exception 'Já existe um cadastro com os dados informados. Confira CPF e matrícula.' using errcode='23505';end;
 select * into person from public.roster_people where staff_id=target;
 perform private.set_roster_contact(person.id,phone,person.version);
 return target;
end;$$;
revoke all on function private.save_staff_member(uuid,integer,text,text,text,text,date,text) from public,anon,authenticated;
grant execute on function private.save_staff_member(uuid,integer,text,text,text,text,date,text) to authenticated;
create function public.save_staff_member(p_id uuid,p_version integer,p_nome text,p_rank text,p_mf text,p_cpf text,p_birth date,p_contact text) returns uuid
language sql security invoker set search_path='' as $$select private.save_staff_member(p_id,p_version,p_nome,p_rank,p_mf,p_cpf,p_birth,p_contact);$$;
revoke all on function public.save_staff_member(uuid,integer,text,text,text,text,date,text) from public,anon,authenticated;
grant execute on function public.save_staff_member(uuid,integer,text,text,text,text,date,text) to authenticated;

create or replace function public.get_staff_snapshot() returns jsonb
language sql stable security invoker set search_path='' as $$
 with contacts as(select * from jsonb_to_recordset(public.get_roster_people()) as p(staff_id uuid,resolved_contact text))
 select jsonb_build_object('fonte',coalesce((select source_label from public.import_batches where kind='efetivo'),'Cadastro DGSCI'),
 'importadoEm',(select imported_at from public.import_batches where kind='efetivo'),'modo','supabase',
 'registros',coalesce((select jsonb_agg(to_jsonb(t) order by t."ordemFonte") from(
 select s.id,s.source_order as "ordemFonte",s.posto_graduacao as "postoGraduacao",s.nome,s.mf,s.cpf,
 to_char(s.data_nascimento,'DD/MM/YYYY') as "dataNascimento",s.categoria,s.source_page as "paginaFonte",s.version,
 c.resolved_contact as contato from public.staff s left join contacts c on c.staff_id=s.id
 )t),'[]'::jsonb));
$$;
create function public.get_absence_roster_conflicts(p_staff_id uuid,p_start date,p_end date) returns jsonb
language plpgsql stable security invoker set search_path='' as $$begin
 perform private.require_roster_manager();
 return coalesce((select jsonb_agg(to_jsonb(t) order by service_date) from(
 select r.id,r.service_date,case p.id when r.chief_id then 'Chefe do Plantão' when r.assistant_id then 'Aux. e Cond do Perito' else 'Perito de Incêndio' end as duty_role
 from public.plantao_roster r join public.roster_people p on p.id in(r.chief_id,r.assistant_id,r.expert_id)
 where p.staff_id=p_staff_id and r.service_date between p_start and p_end
 )t),'[]'::jsonb);
end;$$;
revoke all on function public.get_absence_roster_conflicts(uuid,date,date) from public,anon,authenticated;
grant execute on function public.get_absence_roster_conflicts(uuid,date,date) to authenticated;
commit;
