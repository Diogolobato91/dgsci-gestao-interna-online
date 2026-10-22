-- Central de notificações: paginação e recibos existentes, sob RLS.
create or replace function public.get_my_notices(p_offset integer default 0,p_unseen boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'unseen_count',(select count(*) from public.notice_publications p where not exists(select 1 from public.notice_receipts r where r.publication_id=p.id and r.user_id=(select auth.uid()))),
 'total',(select count(*) from public.notice_publications p where not coalesce(p_unseen,false) or not exists(select 1 from public.notice_receipts r where r.publication_id=p.id and r.user_id=(select auth.uid()))),
 'items',coalesce((select jsonb_agg(to_jsonb(t) order by t.published_at desc,t.publication_id) from(
 select p.id as publication_id,p.published_at,d.title,d.description,d.date,d.sections,d.attachments,
 exists(select 1 from public.notice_receipts r where r.publication_id=p.id and r.user_id=(select auth.uid())) as acknowledged
 from public.notice_publications p join public.support_documents d on d.id=p.document_id
 where d.type='notice' and not d.is_demo and (not coalesce(p_unseen,false) or not exists(select 1 from public.notice_receipts r where r.publication_id=p.id and r.user_id=(select auth.uid())))
 order by p.published_at desc,p.id limit 20 offset greatest(0,least(coalesce(p_offset,0),100000))
 )t),'[]'::jsonb));
$$;
revoke all on function public.get_my_notices(integer,boolean) from public,anon,authenticated;
grant execute on function public.get_my_notices(integer,boolean) to authenticated;

-- Minha conta: nenhum identificador de terceiros é aceito.
create or replace function private.my_account() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('nome',r.nome,'email',u.email,'posto',r.posto_graduacao,'matricula',r.matricula,'cpf',r.cpf,'nascimento',r.data_nascimento,'contato',r.contato,'version',r.version,'setores',m.sectors)
 into result from public.app_members m join auth.users u on u.id=m.user_id
 join public.user_registrations r on r.user_id=m.user_id
 where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0 and r.status='approved';
 if result is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 return result;
end;$$;
revoke all on function private.my_account() from public,anon,authenticated;
grant execute on function private.my_account() to authenticated;
create or replace function public.get_my_account() returns jsonb language sql stable security invoker set search_path='' as $$select private.my_account();$$;
revoke all on function public.get_my_account() from public,anon,authenticated;
grant execute on function public.get_my_account() to authenticated;

create or replace function private.update_my_contact(p_contato text,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());reg public.user_registrations%rowtype;phone text:=nullif(regexp_replace(p_contato,'\D','','g'),'');
begin
 perform pg_advisory_xact_lock(73425,19102026);
 perform private.my_account();
 select * into reg from public.user_registrations where user_id=actor for update;
 if p_version is null or reg.version<>p_version then raise exception 'Cadastro alterado. Atualize a página antes de salvar.' using errcode='40001';end if;
 if nullif(trim(p_contato),'') is not null and (phone is null or length(phone) not in (10,11) or phone !~ '^[1-9][0-9]+$') then raise exception 'Informe DDD e telefone com 10 ou 11 dígitos.' using errcode='22023';end if;
 update public.user_registrations set contato=phone,version=version+1,updated_at=now() where user_id=actor;
 -- Sincroniza somente vínculos confirmados por CPF E matrícula, nunca pelo nome.
 update public.roster_people p set contato=phone from public.staff s where p.staff_id=s.id
 and regexp_replace(s.cpf,'\D','','g')=regexp_replace(reg.cpf,'\D','','g')
 and regexp_replace(reg.matricula,'[^0-9]','','g')<>''
 and regexp_replace(s.mf,'[^0-9]','','g')=regexp_replace(reg.matricula,'[^0-9]','','g');
 insert into private.user_access_audit(actor_id,actor_email,target_email,action,before_values,after_values,notes)
 values(actor,reg.email,reg.email,'update',jsonb_build_object('contato',reg.contato),jsonb_build_object('contato',phone),'Atualização do próprio contato em Minha conta');
end;$$;
revoke all on function private.update_my_contact(text,integer) from public,anon,authenticated;
grant execute on function private.update_my_contact(text,integer) to authenticated;
create or replace function public.update_my_contact(p_contato text,p_version integer) returns void
language sql security invoker set search_path='' as $$select private.update_my_contact(p_contato,p_version);$$;
revoke all on function public.update_my_contact(text,integer) from public,anon,authenticated;
grant execute on function public.update_my_contact(text,integer) to authenticated;
