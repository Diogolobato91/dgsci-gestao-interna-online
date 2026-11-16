begin;

-- O encerramento não pode depender de uma página aberta. Em ambientes que
-- oferecem pg_cron, a expiração é verificada no servidor a cada minuto.
do $$
declare current_job bigint;
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    select jobid into current_job from cron.job where jobname='expire-support-inactive-tickets' limit 1;
    if current_job is not null then perform cron.unschedule(current_job); end if;
    perform cron.schedule(
      'expire-support-inactive-tickets',
      '* * * * *',
      'select private.expire_support_inactive_tickets()'
    );
  end if;
end;
$$;

commit;
