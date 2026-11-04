begin;
alter table public.user_registrations add column if not exists nome_guerra text check(nome_guerra is null or (length(btrim(nome_guerra)) between 2 and 80 and nome_guerra !~ '[<>[:cntrl:]]'));
alter table public.staff add column if not exists nome_guerra text check(nome_guerra is null or (length(btrim(nome_guerra)) between 2 and 80 and nome_guerra !~ '[<>[:cntrl:]]'));
create or replace function private.capture_registration_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'contato',''),'\D','','g');
begin
 if new.raw_user_meta_data ? 'nome_guerra' and nullif(btrim(new.raw_user_meta_data->>'nome_guerra'),'') is not null and (length(btrim(new.raw_user_meta_data->>'nome_guerra')) not between 2 and 80 or new.raw_user_meta_data->>'nome_guerra' ~ '[<>[:cntrl:]]') then raise exception 'Nome de guerra deve ter entre 2 e 80 caracteres' using errcode='22023';end if;
 if phone<>'' and phone !~ '^[0-9]{10,11}$' then
  raise exception 'Informe um contato válido com DDD' using errcode='22023';
 end if;
 update public.user_registrations set nome_guerra=nullif(upper(btrim(new.raw_user_meta_data->>'nome_guerra')),''),contato=nullif(phone,'') where user_id=new.id;
 return new;
end;$$;
create or replace function private.roster_people_with_contacts() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_roster_manager();
 return coalesce((select jsonb_agg(to_jsonb(t) order by nome) from(
  select p.*, coalesce(s.nome_guerra,r.nome_guerra) as nome_guerra, coalesce(r.contato,p.contato) as resolved_contact,
   case when r.contato is not null then 'Cadastro aprovado' else p.source_label end as contact_source
  from public.roster_people p left join public.staff s on s.id=p.staff_id
  left join public.user_registrations r on r.status='approved'
   and regexp_replace(r.cpf,'\D','','g')=regexp_replace(s.cpf,'\D','','g')
   and regexp_replace(r.matricula,'[^0-9]','','g')<>''
   and regexp_replace(r.matricula,'[^0-9]','','g')=regexp_replace(s.mf,'[^0-9]','','g')
   and exists(select 1 from public.app_members m where m.user_id=r.user_id and m.enabled)
 )t),'[]'::jsonb);
end;$$;
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
        r.nome_guerra,
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
create or replace function private.save_user_full(p_user_id uuid,p_version integer,p_details jsonb,p_sectors text[],p_enabled boolean,p_superadmin boolean) returns void
language plpgsql security definer set search_path='' as $$
declare reg public.user_registrations%rowtype;member public.app_members%rowtype;
begin
 perform private.require_user_manager();
 perform pg_advisory_xact_lock(73425,19102026);
 perform private.require_user_manager();
 if p_details is null or jsonb_typeof(p_details)<>'object' or p_enabled is null or p_superadmin is null or p_sectors is null then raise exception 'Confira os dados e permissões.' using errcode='22023';end if;
 select * into reg from public.user_registrations where user_id=p_user_id for update;
 if not found then raise exception 'Cadastro não localizado.' using errcode='22023';end if;
 select * into member from public.app_members where user_id=p_user_id;
 if reg.status not in ('approved','blocked') and (p_enabled is distinct from member.enabled or p_superadmin or p_sectors is distinct from member.sectors) then
  raise exception 'Use Aprovar ou Reavaliar para conceder acesso a este cadastro.' using errcode='22023';
 end if;
 perform private.update_personal_data(p_user_id,p_version,p_details->>'nome',p_details->>'posto',p_details->>'matricula',p_details->>'cpf',nullif(p_details->>'nascimento','')::date,p_details->>'contato');
 if p_details ? 'nome_guerra' then
  if nullif(btrim(p_details->>'nome_guerra'),'') is not null and (length(btrim(p_details->>'nome_guerra')) not between 2 and 80 or p_details->>'nome_guerra' ~ '[<>[:cntrl:]]') then raise exception 'Confira o nome de guerra (2 a 80 caracteres)' using errcode='22023';end if;
  update public.user_registrations set nome_guerra=nullif(upper(btrim(p_details->>'nome_guerra')),'') where user_id=p_user_id;
  if reg.nome_guerra is distinct from nullif(upper(btrim(p_details->>'nome_guerra')),'') then
   insert into private.user_access_audit(actor_id,actor_email,target_email,action,before_values,after_values,notes)
   values(auth.uid(),(select email from auth.users where id=auth.uid()),reg.email,'update',jsonb_build_object('nome_guerra',reg.nome_guerra),jsonb_build_object('nome_guerra',nullif(upper(btrim(p_details->>'nome_guerra')),'')),'Correção do nome de guerra pelo superadministrador');
  end if;
 end if;
 if reg.status in ('approved','blocked') then
  perform private.save_managed_user(reg.email,p_details->>'nome',p_sectors,p_enabled,p_superadmin,p_version+1);
 end if;
end;$$;
create or replace function private.save_staff_member_with_war_name(p_id uuid,p_version integer,p_nome text,p_rank text,p_mf text,p_cpf text,p_birth date,p_contact text,p_nome_guerra text) returns uuid
language plpgsql security definer set search_path='' as $$declare target uuid;war text:=nullif(upper(btrim(p_nome_guerra)),'');begin
 perform private.require_roster_manager();
 if war is not null and (length(war) not between 2 and 80 or war ~ '[<>[:cntrl:]]') then raise exception 'Confira o nome de guerra (2 a 80 caracteres)' using errcode='22023';end if;
 target:=private.save_staff_member(p_id,p_version,p_nome,p_rank,p_mf,p_cpf,p_birth,p_contact);
 update public.staff set nome_guerra=war where id=target and nome_guerra is distinct from war;
 return target;
end;$$;
revoke all on function private.save_staff_member_with_war_name(uuid,integer,text,text,text,text,date,text,text) from public,anon,authenticated;
grant execute on function private.save_staff_member_with_war_name(uuid,integer,text,text,text,text,date,text,text) to authenticated;
create or replace function public.save_staff_member(p_id uuid,p_version integer,p_nome text,p_rank text,p_mf text,p_cpf text,p_birth date,p_contact text,p_nome_guerra text) returns uuid
language sql security invoker set search_path='' as $$select private.save_staff_member_with_war_name(p_id,p_version,p_nome,p_rank,p_mf,p_cpf,p_birth,p_contact,p_nome_guerra);$$;
revoke all on function public.save_staff_member(uuid,integer,text,text,text,text,date,text,text) from public,anon,authenticated;
grant execute on function public.save_staff_member(uuid,integer,text,text,text,text,date,text,text) to authenticated;
create or replace function public.get_staff_snapshot() returns jsonb
language sql stable security invoker set search_path='' as $$
 with contacts as(select * from jsonb_to_recordset(public.get_roster_people()) as p(staff_id uuid,resolved_contact text,nome_guerra text))
 select jsonb_build_object('fonte',coalesce((select source_label from public.import_batches where kind='efetivo'),'Cadastro DGSCI'),
 'importadoEm',(select imported_at from public.import_batches where kind='efetivo'),'modo','supabase',
 'registros',coalesce((select jsonb_agg(to_jsonb(t) order by t."ordemFonte") from(
 select s.id,s.source_order as "ordemFonte",s.posto_graduacao as "postoGraduacao",s.nome,s.mf,s.cpf,
 to_char(s.data_nascimento,'DD/MM/YYYY') as "dataNascimento",s.categoria,s.source_page as "paginaFonte",s.version,
 c.nome_guerra as "nomeGuerra",c.resolved_contact as contato from public.staff s left join contacts c on c.staff_id=s.id
 )t),'[]'::jsonb));
$$;
create or replace function private.today_duty() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  day date := (now() at time zone 'America/Fortaleza')::date;
  duty public.plantao_roster%rowtype;
  team jsonb;
  review boolean;
begin
  if not exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0) then
    raise exception 'Acesso não autorizado.' using errcode='42501';
  end if;
  select * into duty from public.plantao_roster where service_date=day;
  if not found then
    return jsonb_build_object('date',day,'registered',false,'needs_review',false,'team','[]'::jsonb);
  end if;
  select jsonb_agg(jsonb_build_object('role',v.label,'nome',coalesce(s.nome_guerra,r.nome_guerra,p.nome),'posto',p.posto_graduacao,
    'contato',coalesce(r.contato,p.contato)) order by v.position),
    coalesce(bool_or(exists(select 1 from public.staff_absences a where a.staff_id=p.staff_id
      and a.cancelled_at is null and day between a.starts_on and a.ends_on)),false)
    into team,review
  from (values(1,'Chefe do Plantão',duty.chief_id),(2,'Aux. e Cond do Perito',duty.assistant_id),
    (3,'Perito de Incêndio',duty.expert_id)) v(position,label,person_id)
  join public.roster_people p on p.id=v.person_id
  left join public.staff s on s.id=p.staff_id
  left join lateral (
    select reg.contato,reg.nome_guerra from public.user_registrations reg
    where reg.status='approved'
      and regexp_replace(reg.cpf,'\D','','g')=regexp_replace(s.cpf,'\D','','g')
      and regexp_replace(reg.matricula,'[^0-9]','','g')<>''
      and regexp_replace(reg.matricula,'[^0-9]','','g')=regexp_replace(s.mf,'[^0-9]','','g')
      and exists(select 1 from public.app_members m where m.user_id=reg.user_id and m.enabled)
    limit 1
  ) r on true;
  return jsonb_build_object('date',day,'registered',true,'needs_review',review,'team',team);
end;$$;
commit;
