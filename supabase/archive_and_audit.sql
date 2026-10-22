-- Arquivamento reversível, preservando conteúdo e anexos.
alter table public.support_documents add column archived_at timestamptz,add column archived_by uuid references auth.users(id),add column archive_reason text;
create function private.can_manage_document(p_type text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and ((p_type='model' and m.sectors && array['Diretoria','Subdiretoria'])or(p_type='notice' and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])));
$$;
revoke all on function private.can_manage_document(text) from public,anon,authenticated;
grant execute on function private.can_manage_document(text) to authenticated;
drop policy support_documents_read on public.support_documents;
create policy support_documents_read on public.support_documents for select to authenticated using(type in('model','notice') and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled) and (archived_at is null or private.can_manage_document(type)));
create function private.stamp_document_archive() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='INSERT' then new.archived_at:=null;new.archived_by:=null;new.archive_reason:=null;
 elsif new.archived_at is distinct from old.archived_at then
  if not private.can_manage_document(new.type) then raise exception 'Sem permissão para arquivar este documento.' using errcode='42501';end if;
  if new.archived_at is not null then
   if new.archive_reason is null or length(trim(new.archive_reason)) not between 3 and 500 then raise exception 'Informe um motivo entre 3 e 500 caracteres.' using errcode='22023';end if;
   new.archived_at:=clock_timestamp();new.archived_by:=(select auth.uid());new.archive_reason:=trim(new.archive_reason);
  else new.archived_by:=null;new.archive_reason:=null;end if;
 else new.archived_by:=old.archived_by;new.archive_reason:=old.archive_reason;end if;return new;
end;$$;
revoke all on function private.stamp_document_archive() from public,anon,authenticated;
create trigger archive_document_stamp before insert or update on public.support_documents for each row execute function private.stamp_document_archive();
create function private.set_document_archive(p_id text,p_revision integer,p_archived boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$declare item public.support_documents%rowtype;begin
 select * into item from public.support_documents where id=p_id for update;
 if not found or not private.can_manage_document(item.type) then raise exception 'Sem permissão para esta operação.' using errcode='42501';end if;
 if p_archived is null then raise exception 'Informe a ação de arquivamento.' using errcode='22023';end if;
 if p_revision is null or item.revision<>p_revision then raise exception 'Conteúdo alterado. Atualize a lista.' using errcode='40001';end if;
 if (item.archived_at is not null)=p_archived then return;end if;
 update public.support_documents set archived_at=case when p_archived then clock_timestamp() else null end,archive_reason=p_reason where id=p_id;
end;$$;
revoke all on function private.set_document_archive(text,integer,boolean,text) from public,anon,authenticated;
grant execute on function private.set_document_archive(text,integer,boolean,text) to authenticated;
create function public.set_document_archive(p_id text,p_revision integer,p_archived boolean,p_reason text default null) returns void language sql security invoker set search_path='' as $$select private.set_document_archive(p_id,p_revision,p_archived,p_reason);$$;
revoke all on function public.set_document_archive(text,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.set_document_archive(text,integer,boolean,text) to authenticated;
drop policy notice_publications_read on public.notice_publications;
create policy notice_publications_read on public.notice_publications for select to authenticated using(exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and cardinality(m.sectors)>0) and exists(select 1 from public.support_documents d where d.id=document_id and d.type='notice' and not d.is_demo and d.archived_at is null));

-- Eventos anexados pelo servidor. Sem UPDATE/DELETE ou escrita direta pelo cliente.
create table private.audit_events(
 id bigint generated always as identity primary key,occurred_at timestamptz not null default clock_timestamp(),
 actor_id uuid,actor_name text,actor_email text,session_id text,transaction_id text not null default txid_current()::text,
 source text not null check(source in('database','portal')),resource text not null,record_id text,record_label text,
 action text not null,before_values jsonb,after_values jsonb,changed_fields text[] not null default '{}'
);
create index audit_events_time on private.audit_events(occurred_at desc,id desc);
create index audit_events_record on private.audit_events(resource,record_id,occurred_at desc);
create index audit_events_actor on private.audit_events(actor_id,occurred_at desc);
create unique index audit_session_once on private.audit_events(actor_id,session_id) where action='session_open' and session_id is not null;
alter table private.audit_events enable row level security;
revoke all on private.audit_events from public,anon,authenticated;
create policy audit_deny_direct on private.audit_events for all to authenticated using(false) with check(false);
create function private.protect_audit_events() returns trigger language plpgsql set search_path='' as $$begin raise exception 'O histórico de auditoria não pode ser alterado ou excluído.' using errcode='42501';end;$$;
revoke all on function private.protect_audit_events() from public,anon,authenticated;
create trigger protect_audit_events before update or delete on private.audit_events for each row execute function private.protect_audit_events();
create function private.audit_snapshot(p_table text,p_row jsonb) returns jsonb language plpgsql stable set search_path='' as $$declare result jsonb;begin
 if p_row is null then return null;end if;
 result:=p_row-array['password','senha','access_token','refresh_token','token','source_values','before_values','after_values'];
 if result ? 'cpf' and nullif(result->>'cpf','') is not null then result:=jsonb_set(result,'{cpf}','"[dado protegido]"');end if;
 if result ? 'data_nascimento' and nullif(result->>'data_nascimento','') is not null then result:=jsonb_set(result,'{data_nascimento}','"[dado protegido]"');end if;
 if p_table='plantao_roster' then result:=result||jsonb_build_object(
 'chief_name',(select p.posto_graduacao||' '||p.nome from public.roster_people p where p.id=nullif(p_row->>'chief_id','')::uuid),
 'assistant_name',(select p.posto_graduacao||' '||p.nome from public.roster_people p where p.id=nullif(p_row->>'assistant_id','')::uuid),
 'expert_name',(select p.posto_graduacao||' '||p.nome from public.roster_people p where p.id=nullif(p_row->>'expert_id','')::uuid));end if;
 return result;
end;$$;
revoke all on function private.audit_snapshot(text,jsonb) from public,anon,authenticated;
create function private.capture_audit_event() returns trigger language plpgsql security definer set search_path='' as $$
declare prev jsonb;next jsonb;row_data jsonb;actor uuid:=(select auth.uid());fields text[];act text:=lower(tg_op);resource_name text:=tg_table_name;ref text;begin
 if tg_op<>'INSERT' then prev:=to_jsonb(old);end if;
 if tg_op<>'DELETE' then next:=to_jsonb(new);end if;
 if tg_op='UPDATE' and (prev-array['updated_at','updated_by','version','revision'])=(next-array['updated_at','updated_by','version','revision']) then return new;end if;
 select coalesce(array_agg(k order by k),'{}') into fields from (select jsonb_object_keys(coalesce(prev,'{}')||coalesce(next,'{}')) k)t where prev->k is distinct from next->k and not k=any(array['updated_at','updated_by','version','revision','before_values','after_values','source_values']);
 row_data:=coalesce(next,prev);
 if tg_table_schema='private' and tg_table_name='user_access_audit' then
  act:=coalesce(row_data->>'action',act);
  if actor is null then actor:=nullif(row_data->>'actor_id','')::uuid;end if;
 end if;
 ref:=case when tg_table_name in('plantao_roster','cleaning_roster') then row_data->>'service_date' else coalesce(row_data->>'id',row_data->>'user_id',row_data->>'month',row_data->>'email',row_data->>'year') end;
 if tg_table_schema='private' then resource_name:=tg_table_schema||'.'||tg_table_name;end if;
 if tg_table_name='support_documents' and tg_op='UPDATE' and prev->>'archived_at' is distinct from next->>'archived_at' then act:=case when next->>'archived_at' is null then 'restore' else 'archive' end;end if;
 insert into private.audit_events(actor_id,actor_name,actor_email,source,resource,record_id,record_label,action,before_values,after_values,changed_fields)
 values(actor,(select display_name from public.app_members where user_id=actor),(select email from auth.users where id=actor),'database',resource_name,ref,
 left(coalesce(row_data->>'title',row_data->>'nome',row_data->>'display_name',row_data->>'numero',row_data->>'protocolo',row_data->>'service_date',row_data->>'month',row_data->>'target_email',ref,tg_table_name),180),act,private.audit_snapshot(tg_table_name,prev),private.audit_snapshot(tg_table_name,next),fields);
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function private.capture_audit_event() from public,anon,authenticated;
do $$declare t record;begin
 for t in select schemaname,tablename from pg_tables where (schemaname='public' and tablename not in('authorization_events','notice_publications')) or (schemaname='private' and tablename in('login_allowlist','user_access_audit')) loop
 execute format('create trigger capture_audit_event after insert or update or delete on %I.%I for each row execute function private.capture_audit_event()',t.schemaname,t.tablename);
 end loop;
end$$;

create function private.list_audit_events(p_resource text,p_reference text,p_actor uuid,p_action text,p_from timestamptz,p_to timestamptz,p_offset integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare full_access boolean;result jsonb;roster_resources text[]:=array['plantao_roster','cleaning_roster','roster_people','roster_plans','roster_plan_rows','duty_roster'];begin
 full_access:=private.is_superadmin((select auth.uid()));
 if not full_access and not(p_resource='rosters' and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.enabled and m.sectors && array['Secretaria','Diretoria','Subdiretoria'])) then raise exception 'Acesso não autorizado ao histórico.' using errcode='42501';end if;
 -- NULL não pode contornar a autorização (SQL tem lógica ternária).
 if not full_access and p_resource is distinct from 'rosters' then raise exception 'Acesso não autorizado ao histórico.' using errcode='42501';end if;
 select jsonb_build_object('total',count(*),'items',coalesce((select jsonb_agg(to_jsonb(s) order by s.occurred_at desc,s.id desc) from(
 select e.* from private.audit_events e where
 (p_resource is null or (p_resource='rosters' and e.resource=any(roster_resources)) or e.resource=p_resource)
 and(p_reference is null or e.record_id=p_reference)and(p_actor is null or e.actor_id=p_actor)and(p_action is null or e.action=p_action)
 and(p_from is null or e.occurred_at>=p_from)and(p_to is null or e.occurred_at<p_to)
 order by e.occurred_at desc,e.id desc limit 30 offset greatest(0,least(coalesce(p_offset,0),1000000))
 )s),'[]'::jsonb)) into result from private.audit_events e where
 (p_resource is null or(p_resource='rosters' and e.resource=any(roster_resources))or e.resource=p_resource)
 and(p_reference is null or e.record_id=p_reference)and(p_actor is null or e.actor_id=p_actor)and(p_action is null or e.action=p_action)
 and(p_from is null or e.occurred_at>=p_from)and(p_to is null or e.occurred_at<p_to);
 return result;
end;$$;
revoke all on function private.list_audit_events(text,text,uuid,text,timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function private.list_audit_events(text,text,uuid,text,timestamptz,timestamptz,integer) to authenticated;
create function public.get_audit_events(p_resource text default null,p_reference text default null,p_actor uuid default null,p_action text default null,p_from timestamptz default null,p_to timestamptz default null,p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$select private.list_audit_events(p_resource,p_reference,p_actor,p_action,p_from,p_to,p_offset);$$;
revoke all on function public.get_audit_events(text,text,uuid,text,timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.get_audit_events(text,text,uuid,text,timestamptz,timestamptz,integer) to authenticated;

create function private.log_portal_activity(p_action text,p_resource text,p_reference text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=(select auth.uid());sid text;begin
 if not exists(select 1 from public.app_members m where m.user_id=actor and m.enabled and cardinality(m.sectors)>0) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_action is null or not p_action=any(array['session_open','session_close','page_view','download_request']) or length(coalesce(p_resource,''))>120 or length(coalesce(p_reference,''))>250 then raise exception 'Atividade inválida.' using errcode='22023';end if;
 -- JWT validado pelo gateway; nenhuma identidade vem de parâmetros do solicitante.
 sid:=nullif(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')->>'session_id','');
 if p_action='session_open' and sid is null then return;end if;
 insert into private.audit_events(actor_id,actor_name,actor_email,session_id,source,resource,record_id,record_label,action)
 values(actor,(select display_name from public.app_members where user_id=actor),(select email from auth.users where id=actor),sid,'portal',coalesce(p_resource,'portal'),p_reference,left(coalesce(p_reference,p_resource,'Portal DGSCI'),180),p_action) on conflict do nothing;
end;$$;
revoke all on function private.log_portal_activity(text,text,text) from public,anon,authenticated;
grant execute on function private.log_portal_activity(text,text,text) to authenticated;
create function public.log_portal_activity(p_action text,p_resource text default 'portal',p_reference text default null) returns void language sql security invoker set search_path='' as $$select private.log_portal_activity(p_action,p_resource,p_reference);$$;
revoke all on function public.log_portal_activity(text,text,text) from public,anon,authenticated;
grant execute on function public.log_portal_activity(text,text,text) to authenticated;
