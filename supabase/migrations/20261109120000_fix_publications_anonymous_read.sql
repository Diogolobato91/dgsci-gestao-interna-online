-- A política anterior combinava anon e authenticated com uma consulta a app_members.
-- O planejador pode avaliar essa consulta para anon; separamos os papéis para a
-- leitura pública de documentos ativos não depender da tabela interna.

drop policy if exists publications_public_read on public.publications;

create policy publications_anon_active_read
on public.publications for select to anon
using (active);

create policy publications_authenticated_read
on public.publications for select to authenticated
using (
  active
  or exists (
    select 1
    from public.app_members m
    where m.user_id = auth.uid()
      and m.enabled
      and 'Subdiretoria' = any(m.sectors)
  )
);
