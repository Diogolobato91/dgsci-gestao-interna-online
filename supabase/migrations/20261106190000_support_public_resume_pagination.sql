begin;

create or replace function public.create_support_ticket(p_service text,p_cnpj text,p_requester text,p_phone text,p_email text,p_city text,p_reference text,p_summary text,p_access_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare service_row public.support_services%rowtype;ticket_row public.support_tickets%rowtype;clean_cnpj text:=regexp_replace(coalesce(p_cnpj,''),'\D','','g');clean_phone text:=regexp_replace(coalesce(p_phone,''),'\D','','g');begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 select * into service_row from public.support_services where id=p_service and enabled;
 if not found then raise exception 'Serviço inválido' using errcode='22023';end if;
 if not private.is_valid_cnpj(clean_cnpj) then raise exception 'CNPJ inválido' using errcode='22023';end if;
 if length(btrim(coalesce(p_requester,''))) not between 3 and 160 or clean_phone!~'^[0-9]{10,11}$' or coalesce(p_email,'')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(btrim(coalesce(p_city,''))) not between 2 and 120 or length(btrim(coalesce(p_summary,''))) not between 20 and 1500 or coalesce(p_access_hash,'')!~'^[a-f0-9]{64}$' then raise exception 'Confira os dados obrigatórios' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('dgsci-support-cnpj:'||clean_cnpj,0));
 select * into ticket_row from public.support_tickets where cnpj=clean_cnpj and status not in('completed','cancelled') order by created_at desc limit 1 for update;
 if found then
  update public.support_tickets set requester_name=btrim(p_requester),phone=clean_phone,email=lower(btrim(p_email)),city=btrim(p_city),public_access_hash=p_access_hash,updated_at=clock_timestamp(),version=version+1 where id=ticket_row.id returning * into ticket_row;
  insert into public.support_messages(ticket_id,author_kind,body) values(ticket_row.id,'customer',btrim(p_summary));
  insert into private.support_ticket_events(ticket_id,action,details) values(ticket_row.id,'resumed',jsonb_build_object('by','customer','source','public_intake'));
  return jsonb_build_object('id',ticket_row.id,'protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'status',ticket_row.status,'created_at',ticket_row.created_at,'resumed',true);
 end if;
 insert into public.support_tickets(protocol,queue_id,service_id,cnpj,requester_name,phone,email,city,external_reference,summary,public_access_hash)
 values(private.next_support_protocol(),service_row.queue_id,service_row.id,clean_cnpj,btrim(p_requester),clean_phone,lower(btrim(p_email)),btrim(p_city),btrim(coalesce(p_reference,'')),btrim(p_summary),p_access_hash) returning * into ticket_row;
 insert into private.support_ticket_events(ticket_id,action,details) values(ticket_row.id,'created',jsonb_build_object('queue_id',service_row.queue_id,'service_id',service_row.id));
 insert into public.support_messages(ticket_id,author_kind,body) values(ticket_row.id,'customer',btrim(p_summary));
 perform private.assign_support_ticket(ticket_row.id);
 select t.* into ticket_row from public.support_tickets t where t.id=ticket_row.id;
 return jsonb_build_object('id',ticket_row.id,'protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'status',ticket_row.status,'created_at',ticket_row.created_at,'resumed',false);
end;$$;

create function public.get_support_conversation_page_public(p_protocol text,p_cnpj text,p_access_hash text,p_before timestamptz default null,p_limit integer default 10) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ticket_row public.support_tickets%rowtype;position integer;message_rows jsonb;has_more boolean;begin
 if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço de atendimento' using errcode='42501';end if;
 if p_limit not between 1 and 50 then raise exception 'Limite inválido' using errcode='22023';end if;
 select * into ticket_row from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash;
 if not found then return null;end if;
 if ticket_row.status='queued' then select count(*)::integer into position from public.support_tickets t where t.queue_id=ticket_row.queue_id and t.status='queued' and (t.created_at,t.id)<(ticket_row.created_at,ticket_row.id);else position:=0;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'author',x.author_kind,'actor_label',x.actor_label,'body',x.body,'created_at',x.created_at) order by x.created_at,x.id),'[]'::jsonb) into message_rows from(select sm.id,sm.author_kind,case when sm.author_kind='customer' then ticket_row.requester_name when sm.author_kind='system' then 'Sistema' else btrim(concat(coalesce(nullif(au.raw_user_meta_data->>'posto_graduacao',''),'VC'),' ',coalesce(am.display_name,'DGSCI'))) end actor_label,sm.body,sm.created_at from public.support_messages sm left join public.app_members am on am.user_id=sm.actor_id left join auth.users au on au.id=sm.actor_id where sm.ticket_id=ticket_row.id and(p_before is null or sm.created_at<p_before)order by sm.created_at desc,sm.id desc limit p_limit)x;
 select exists(select 1 from public.support_messages sm where sm.ticket_id=ticket_row.id and sm.created_at<coalesce((select min((m->>'created_at')::timestamptz)from jsonb_array_elements(message_rows)m),'-infinity'::timestamptz)) into has_more;
 return jsonb_build_object('protocol',ticket_row.protocol,'queue_id',ticket_row.queue_id,'queue_label',(select label from public.support_queues where id=ticket_row.queue_id),'service_id',ticket_row.service_id,'service_label',(select label from public.support_services where id=ticket_row.service_id),'status',ticket_row.status,'people_ahead',position,'created_at',ticket_row.created_at,'updated_at',ticket_row.updated_at,'assigned_name',(select display_name from public.app_members where user_id=ticket_row.assigned_to),'messages',message_rows,'has_more',has_more,'ticket_id',ticket_row.id);
end;$$;

create function public.prepare_support_attachment_public(p_protocol text,p_cnpj text,p_access_hash text) returns uuid language plpgsql stable security definer set search_path='' as $$declare tid uuid;begin if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço' using errcode='42501';end if;select id into tid from public.support_tickets where protocol=upper(btrim(p_protocol)) and cnpj=regexp_replace(coalesce(p_cnpj,''),'\D','','g') and public_access_hash=p_access_hash and status not in('completed','cancelled');return tid;end;$$;
create function public.register_support_attachment_public(p_protocol text,p_cnpj text,p_access_hash text,p_file_name text,p_file_path text,p_mime_type text,p_size bigint) returns jsonb language plpgsql security definer set search_path='' as $$declare tid uuid;row public.support_attachments%rowtype;begin if auth.role()<>'service_role' then raise exception 'Operação exclusiva do serviço' using errcode='42501';end if;select public.prepare_support_attachment_public(p_protocol,p_cnpj,p_access_hash) into tid;if tid is null then return null;end if;if p_mime_type not in('image/jpeg','image/png','image/webp','application/pdf') or p_size not between 1 and 10485760 or p_file_path not like tid::text||'/%' then raise exception 'Arquivo inválido' using errcode='22023';end if;insert into public.support_attachments(ticket_id,file_name,file_path,mime_type,size_bytes)values(tid,left(p_file_name,200),p_file_path,p_mime_type,p_size)returning * into row;return to_jsonb(row);end;$$;

revoke all on function public.get_support_conversation_page_public(text,text,text,timestamptz,integer),public.prepare_support_attachment_public(text,text,text),public.register_support_attachment_public(text,text,text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.get_support_conversation_page_public(text,text,text,timestamptz,integer),public.prepare_support_attachment_public(text,text,text),public.register_support_attachment_public(text,text,text,text,text,text,bigint) to service_role;

commit;
