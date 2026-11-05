-- Credenciamento passa a ter a planilha oficial como única fonte de dados.
-- A aplicação não consulta nem escreve cópias locais dessas relações.
revoke insert, update, delete on table public.accreditations from authenticated;
drop policy if exists accreditation_insert on public.accreditations;
drop policy if exists accreditation_update on public.accreditations;
delete from public.accreditation_imports;
delete from public.accreditations;
