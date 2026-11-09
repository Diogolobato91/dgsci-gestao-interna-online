begin;

insert into auth.users(id,email,raw_user_meta_data) values
 ('98000000-0000-4000-8000-000000000001','support-link-agent@example.invalid','{"nome":"Agente de Teste","posto_graduacao":"VC","matricula":"9801","cpf":"52998224725","data_nascimento":"1990-01-01"}')
on conflict(id) do nothing;
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id='98000000-0000-4000-8000-000000000001';
insert into public.support_agents(user_id,queue_ids,available) values('98000000-0000-4000-8000-000000000001',array['inspection'],true) on conflict(user_id) do nothing;

insert into public.support_tickets(id,protocol,queue_id,service_id,cnpj,requester_name,phone,email,city,summary,public_access_hash,status,assigned_to)
values('98000000-0000-4000-8000-000000000101','ATD-LINK-001','inspection','request-inspection','11222333000181','Solicitante de Teste','91999999999','link@example.invalid','Belém','Solicitação utilizada para testar anexos e histórico.',repeat('d',64),'in_progress','98000000-0000-4000-8000-000000000001');
insert into public.support_messages(ticket_id,author_kind,body) values('98000000-0000-4000-8000-000000000101','customer','Mensagem inicial do teste.');
insert into private.support_ticket_events(ticket_id,action,actor_id,details) values
 ('98000000-0000-4000-8000-000000000101','assigned','98000000-0000-4000-8000-000000000001',jsonb_build_object('agent_id','98000000-0000-4000-8000-000000000001')),
 ('98000000-0000-4000-8000-000000000101','started','98000000-0000-4000-8000-000000000001',jsonb_build_object('to','in_progress'));

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare attached jsonb;paged jsonb;begin
 attached:=public.register_support_attachment_public('ATD-LINK-001','11222333000181',repeat('d',64),'arquivo-duplicado.pdf','98000000-0000-4000-8000-000000000101/arquivo-duplicado.pdf','application/pdf',1024);
 if attached->>'message_id' is null then raise exception 'Anexo público não foi ligado à mensagem';end if;
 paged:=public.get_support_conversation_page_public('ATD-LINK-001','11222333000181',repeat('d',64),null,10);
 if not exists(select 1 from jsonb_array_elements(paged->'messages') item where item->>'attachment_id'=attached->>'id') then raise exception 'Conversa pública não retornou vínculo do anexo';end if;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000001',true);
do $$begin
 if jsonb_array_length(public.get_support_ticket_messages('98000000-0000-4000-8000-000000000101'))<3 then raise exception 'Histórico interno não retornou os eventos';end if;
end$$;
reset role;

rollback;
