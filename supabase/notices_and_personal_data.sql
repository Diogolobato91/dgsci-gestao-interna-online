-- Correções cadastrais sem alterar aprovação, setores, papel ou autenticação.
create or replace function private.update_personal_data(p_user_id uuid,p_version integer,p_nome text,p_posto text,p_matricula text,p_cpf text,p_nascimento date,p_contato text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid;prev public.user_registrations%rowtype;clean_cpf text:=nullif(regexp_replace(p_cpf,'\D','','g'),'');phone text:=nullif(regexp_replace(p_contato,'\D','','g'),'');rank text:=nullif(trim(p_posto),'');mf text:=nullif(trim(p_matricula),'');new_values jsonb;
begin
 actor:=private.require_user_manager();
 perform pg_advisory_xact_lock(73425,19102026);
 actor:=private.require_user_manager();
 select * into prev from public.user_registrations where user_id=p_user_id for update;
 if not found then raise exception 'Cadastro não localizado. Atualize a lista.' using errcode='22023';end if;
 if p_version is null or prev.version<>p_version then raise exception 'Cadastro alterado por outra pessoa. Atualize a lista.' using errcode='40001';end if;
 if p_nome is null or length(trim(p_nome)) not between 2 and 160 then raise exception 'Informe um nome entre 2 e 160 caracteres.' using errcode='22023';end if;
 if rank is not null and not rank=any(array['CEL','TCEL','MAJ','CAP','1º TEN','2º TEN','SUB TEN RR','SUB TEN','1º SGT','2º SGT','3º SGT','CB','SD','VC']) then raise exception 'Posto ou graduação inválido.' using errcode='22023';end if;
 if clean_cpf is not null and not private.is_valid_cpf(clean_cpf) then raise exception 'CPF inválido.' using errcode='22023';end if;
 if mf is not null and length(mf) not between 2 and 50 then raise exception 'Matrícula deve ter entre 2 e 50 caracteres.' using errcode='22023';end if;
 if p_nascimento is not null and (p_nascimento<'1900-01-01' or p_nascimento>(now() at time zone 'America/Fortaleza')::date) then raise exception 'Data de nascimento inválida.' using errcode='22023';end if;
 if phone is not null and length(phone) not in(10,11) then raise exception 'Informe DDD e telefone com 10 ou 11 dígitos.' using errcode='22023';end if;
 if exists(select 1 from public.user_registrations r where r.user_id<>p_user_id and
 ((clean_cpf is not null and regexp_replace(r.cpf,'\D','','g')=clean_cpf) or (mf is not null and lower(trim(r.matricula))=lower(mf)))) then raise exception 'Os dados informados conflitam com outro cadastro existente.' using errcode='23505';end if;
 update public.user_registrations set nome=trim(p_nome),posto_graduacao=rank,matricula=mf,cpf=clean_cpf,data_nascimento=p_nascimento,contato=phone,version=version+1,updated_at=now() where user_id=p_user_id;
 update public.app_members set display_name=trim(p_nome) where user_id=p_user_id;
 update private.login_allowlist set display_name=trim(p_nome),version=version+1,updated_at=now() where email=lower(prev.email);
 new_values:=jsonb_build_object('nome',trim(p_nome),'posto_graduacao',rank,'matricula',mf,'cpf',clean_cpf,'data_nascimento',p_nascimento,'contato',phone);
 insert into private.user_access_audit(actor_id,actor_email,target_email,action,before_values,after_values,notes)
 values(actor,(select email from auth.users where id=actor),prev.email,'update',
 jsonb_build_object('nome',prev.nome,'posto_graduacao',prev.posto_graduacao,'matricula',prev.matricula,'cpf',prev.cpf,'data_nascimento',prev.data_nascimento,'contato',prev.contato),new_values,'Correção de dados pessoais pelo superadministrador; permissões e situação preservadas');
exception when unique_violation then raise exception 'Os dados informados conflitam com outro cadastro existente.' using errcode='23505';
end;$$;
revoke all on function private.update_personal_data(uuid,integer,text,text,text,text,date,text) from public,anon,authenticated;
grant execute on function private.update_personal_data(uuid,integer,text,text,text,text,date,text) to authenticated;
create or replace function public.admin_update_personal_data(p_user_id uuid,p_version integer,p_nome text,p_posto text,p_matricula text,p_cpf text,p_nascimento date,p_contato text) returns void
language sql security invoker set search_path='' as $$select private.update_personal_data(p_user_id,p_version,p_nome,p_posto,p_matricula,p_cpf,p_nascimento,p_contato);$$;
revoke all on function public.admin_update_personal_data(uuid,integer,text,text,text,text,date,text) from public,anon,authenticated;
grant execute on function public.admin_update_personal_data(uuid,integer,text,text,text,text,date,text) to authenticated;

-- Uma publicação por comunicado. Sem retroatividade e sem novos avisos a cada edição.
create table public.notice_publications(id uuid primary key default gen_random_uuid(),document_id text not null unique references public.support_documents(id) on delete cascade,published_at timestamptz not null default now());
create table public.notice_receipts(user_id uuid not null references auth.users(id) on delete cascade,publication_id uuid not null references public.notice_publications(id) on delete cascade,acknowledged_at timestamptz not null default now(),primary key(user_id,publication_id));
alter table public.notice_publications enable row level security;
alter table public.notice_receipts enable row level security;
revoke all on public.notice_publications,public.notice_receipts from public,anon,authenticated;
grant select on public.notice_publications,public.notice_receipts to authenticated;
grant insert(user_id,publication_id) on public.notice_receipts to authenticated;
create policy notice_publications_read on public.notice_publications for select to authenticated using(
 exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0)
 and exists(select 1 from public.support_documents d where d.id=document_id and d.type='notice' and not d.is_demo));
create policy notice_receipts_read on public.notice_receipts for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0));
create policy notice_receipts_insert on public.notice_receipts for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.notice_publications p where p.id=publication_id));
create or replace function private.publish_notice() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.type='notice' and not new.is_demo then
  if tg_op='INSERT' then
   insert into public.notice_publications(document_id)values(new.id) on conflict(document_id) do nothing;
  elsif old.is_demo then
   insert into public.notice_publications(document_id)values(new.id) on conflict(document_id) do nothing;
  end if;
 end if;return new;
end;$$;
revoke all on function private.publish_notice() from public,anon,authenticated;
create trigger publish_notice after insert or update of is_demo on public.support_documents for each row execute function private.publish_notice();
create or replace function public.get_pending_notice() returns jsonb language sql stable security invoker set search_path='' as $$
 select (select jsonb_build_object('publication_id',p.id,'title',d.title,'description',d.description,'date',d.date,'attachments',d.attachments,'sections',d.sections)
 from public.notice_publications p join public.support_documents d on d.id=p.document_id
 where d.type='notice' and not d.is_demo and not exists(select 1 from public.notice_receipts r where r.publication_id=p.id and r.user_id=(select auth.uid()))
 order by p.published_at,p.id limit 1);
$$;
revoke all on function public.get_pending_notice() from public,anon,authenticated;
grant execute on function public.get_pending_notice() to authenticated;
