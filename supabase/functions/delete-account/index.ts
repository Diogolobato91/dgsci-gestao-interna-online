import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, 'Método não permitido.');
  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply(401, 'Sessão inválida.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    const { data: { user }, error: authError } = await caller.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply(401, 'Sessão inválida.');
    const body = await req.json();
    if (typeof body.email !== 'string' || body.confirmation !== body.email) return reply(400, 'Confirme o e-mail da conta.');
    const { data: accounts, error: listError } = await caller.rpc('admin_list_users');
    if (listError || !Array.isArray(accounts)) return reply(403, 'Acesso exclusivo do superadministrador.');
    const target = accounts.find(account => account.email === body.email);
    if (!target || target.version !== body.version) return reply(409, 'O cadastro mudou. Atualize a lista.');
    if (target.user_id === user.id || target.email.toLowerCase() === user.email?.toLowerCase()) return reply(400, 'Você não pode excluir a própria conta.');
    // Os dois componentes da autorização são conferidos novamente pela RPC de bloqueio.
    if (target.user_id) {
      const { error: blockError } = await caller.rpc('admin_toggle_user', { p_user_id: target.user_id, p_enabled: false, p_expected_version: target.version });
      if (blockError) return reply(409, 'Não foi possível bloquear a conta. Atualize a lista e tente novamente.');
      const { error: deleteError } = await admin.auth.admin.deleteUser(target.user_id, true);
      if (deleteError) return reply(500, 'A conta foi bloqueada, mas a exclusão não foi concluída. Atualize a lista antes de tentar novamente.');
    }
    const { error: finalizeError } = await admin.rpc('finalize_account_deletion', { p_user_id: target.user_id || null, p_email: target.email, p_actor: user.id });
    if (finalizeError) return reply(500, 'A exclusão precisa de finalização administrativa. A conta permanece sem acesso.');
    return reply(200, 'Conta excluída. O histórico de alterações foi preservado.');
  } catch { return reply(500, 'Não foi possível excluir a conta. Atualize a consulta e tente novamente.'); }
});
