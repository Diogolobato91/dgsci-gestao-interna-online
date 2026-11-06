begin;

insert into auth.users(id,email,raw_user_meta_data) values
 ('97000000-0000-4000-8000-000000000001','support-admin@example.invalid','{"nome":"Gestor Atendimento","posto_graduacao":"CAP","matricula":"9701","cpf":"52998224725","data_nascimento":"1980-01-01"}'),
 ('97000000-0000-4000-8000-000000000002','support-agent-a@example.invalid','{"nome":"VC Atendimento A","posto_graduacao":"VC","matricula":"9702","cpf":"11144477735","data_nascimento":"1990-01-01"}'),
 ('97000000-0000-4000-8000-000000000003','support-agent-b@example.invalid','{"nome":"VC Atendimento B","posto_graduacao":"VC","matricula":"9703","cpf":"22233344405","data_nascimento":"1991-01-01"}'),
 ('97000000-0000-4000-8000-000000000004','support-outsider@example.invalid','{"nome":"Usuário Sem Atendimento","posto_graduacao":"SD","matricula":"9704","cpf":"12345678909","data_nascimento":"1992-01-01"}');
update public.app_members set enabled=true,role='administrator',sectors=array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'] where user_id='97000000-0000-4000-8000-000000000001';
insert into private.login_allowlist(email,display_name,role,sectors,enabled)values('support-admin@example.invalid','Gestor Atendimento','administrator',array['Diretoria','Subdiretoria','Secretaria','Vistoriador','Análise','Multas'],true)on conflict(email)do update set enabled=true,role=excluded.role,sectors=excluded.sectors;
update public.app_members set enabled=true,sectors=array['Vistoriador'] where user_id in('97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000003');
update public.app_members set enabled=true,sectors=array['Secretaria'] where user_id='97000000-0000-4000-8000-000000000004';

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
select public.admin_set_support_agent('97000000-0000-4000-8000-000000000002',array['inspection','fines'],true,null);
select public.admin_set_support_agent('97000000-0000-4000-8000-000000000003',array['inspection','fines'],true,null);
do $$declare dashboard jsonb;history jsonb;begin dashboard:=public.get_support_admin_dashboard();history:=public.get_support_admin_history();if jsonb_array_length(dashboard->'agents')<2 or jsonb_array_length(dashboard->'queues')<>5 then raise exception 'Painel administrativo não retornou agentes e filas';end if;if history is null then raise exception 'Histórico administrativo indisponível';end if;end$$;
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare result jsonb;i integer;begin
 for i in 1..10 loop
  result:=public.create_support_ticket('request-inspection','11222333000181','Solicitante Teste','91999999999','cliente@example.invalid','Belém','',repeat('Solicitação de vistoria ',2),repeat(to_hex(i),64)::text::char(64)::text);
  if result->>'status'<>'assigned' then raise exception 'Capacidade disponível não recebeu atendimento';end if;
 end loop;
 result:=public.create_support_ticket('request-inspection','11222333000181','Solicitante Teste','91999999999','cliente@example.invalid','Belém','',repeat('Solicitação de vistoria ',2),repeat('a',64));
 if result->>'status'<>'queued' then raise exception 'Limite de cinco atendimentos foi ultrapassado';end if;
 perform set_config('dgsci.test_inspection_protocol',result->>'protocol',true);
 result:=public.create_support_ticket('debt-query','11222333000181','Solicitante Teste','91999999999','cliente@example.invalid','Belém','',repeat('Consulta de multa e débito ',2),repeat('b',64));
 if result->>'status'<>'queued' then raise exception 'Fila de multa deveria aguardar capacidade';end if;
 perform set_config('dgsci.test_fine_protocol',result->>'protocol',true);
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
do $$declare ticket_id uuid;result jsonb;begin
 select id into ticket_id from public.support_tickets where protocol=current_setting('dgsci.test_fine_protocol');
 result:=public.support_send_message(ticket_id,'Orientação administrativa enquanto o cliente aguarda na fila.');
 if result->>'author_kind'<>'agent' or (select status from public.support_tickets where id=ticket_id)<>'queued' then raise exception 'Administração não respondeu chamado na fila corretamente';end if;
end$$;
reset role;

do $$begin
 if exists(select 1 from public.support_agents a where private.support_active_count(a.user_id)>5)then raise exception 'Atendente recebeu mais de cinco ativos';end if;
 if (select max(n)-min(n) from(select count(*) n from public.support_tickets where status in('assigned','in_progress','waiting_customer')group by assigned_to)s)>1 then raise exception 'Distribuição desigual';end if;
end$$;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare inspection jsonb;fine jsonb;begin
 inspection:=public.get_support_ticket_public(current_setting('dgsci.test_inspection_protocol'),repeat('a',64));
 fine:=public.get_support_ticket_public(current_setting('dgsci.test_fine_protocol'),repeat('b',64));
 if inspection->>'people_ahead'<>'0' or fine->>'people_ahead'<>'0' then raise exception 'Posição somou filas diferentes';end if;
 inspection:=public.get_support_conversation_public(current_setting('dgsci.test_inspection_protocol'),'11.222.333/0001-81',repeat('a',64));
 if jsonb_array_length(inspection->'messages')<>1 or inspection->'messages'->0->>'author'<>'customer' then raise exception 'Conversa inicial não foi criada';end if;
 perform public.append_support_customer_message(current_setting('dgsci.test_inspection_protocol'),'11222333000181',repeat('a',64),'Informação complementar enviada pelo cliente.');
 inspection:=public.get_support_conversation_public(current_setting('dgsci.test_inspection_protocol'),'11222333000181',repeat('a',64));
 if jsonb_array_length(inspection->'messages')<>2 then raise exception 'Mensagem do cliente não foi gravada';end if;
 if not public.consume_support_rate_limit('open',repeat('c',64),2,600) or not public.consume_support_rate_limit('open',repeat('c',64),2,600) or public.consume_support_rate_limit('open',repeat('c',64),2,600) then raise exception 'Limitação de requisições não funcionou';end if;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000004',true);
do $$begin
 begin perform public.get_my_support_inbox();raise exception 'Usuário comum acessou atendimento';exception when insufficient_privilege then null;end;
 begin perform public.admin_set_support_agent('97000000-0000-4000-8000-000000000004',array['inspection'],true,null);raise exception 'Usuário comum configurou atendente';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.support_tickets)then raise exception 'Usuário comum leu chamados';end if;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
do $$declare ticket_row public.support_tickets%rowtype;result jsonb;begin
 select * into ticket_row from public.support_tickets where assigned_to=auth.uid() and queue_id='inspection' order by created_at limit 1;
 result:=public.support_send_message(ticket_row.id,'Mensagem inicial de atendimento.');
 select * into ticket_row from public.support_tickets where id=ticket_row.id;
 if ticket_row.status<>'in_progress' or ticket_row.first_response_at is null then raise exception 'Mensagem não iniciou atendimento';end if;
 if public.get_support_ticket_messages(ticket_row.id)->1->>'actor_label' not like 'VC %' then raise exception 'Identificação do atendente não foi exibida';end if;
 result:=public.support_set_internal_notes(ticket_row.id,'Cliente orientado sobre a documentação.',ticket_row.version);
 select * into ticket_row from public.support_tickets where id=ticket_row.id;
 if ticket_row.internal_notes='' then raise exception 'Observação interna não foi salva';end if;
 result:=public.support_set_ticket_status(ticket_row.id,'completed',ticket_row.version);
 if (select count(*)from public.support_tickets where assigned_to=auth.uid() and status in('assigned','in_progress','waiting_customer'))<>5 then raise exception 'Vaga liberada não recebeu próximo cliente';end if;
 if not exists(select 1 from public.support_tickets where assigned_to=auth.uid() and status='assigned' and queue_id='inspection')then raise exception 'Próximo da fila não foi distribuído';end if;
end$$;
reset role;

set local role anon;
do $$begin begin perform count(*)from public.support_queues;raise exception 'Anônimo consultou catálogo interno';exception when insufficient_privilege then null;end;end$$;
reset role;

rollback;
