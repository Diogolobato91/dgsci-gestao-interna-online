# Banco DGSCI

Projeto autorizado: `prozusgomipgwzbyoagj`. Importados 71 registros do efetivo, 87 autorizações e 2 linhas de saldo. Dados reais não são versionados no GitHub nem servidos como arquivos estáticos.

O cadastro exige e-mail previamente autorizado e confirmação por e-mail. No primeiro acesso, use Criar conta e defina sua própria senha. Os setores e a função são obtidos da associação protegida no banco; selecionar um setor não concede permissões.

O arquivo `supabase/schema.sql` documenta tabelas, funções e políticas. A lista de e-mails autorizados é privada. RLS validada com administrador, setor sem permissão, usuário anônimo, tentativa de escalar privilégios e cadastro não autorizado; fixtures revertidas.

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente local ou de implantação. `.env.local` e variantes estão ignorados. A chave publicável aparece no cliente por definição; a proteção está na autenticação e RLS. Nunca colocar senha de banco ou service_role no cliente.

No painel Authentication / URL Configuration, configure a URL do site privado como Site URL e URL de redirecionamento para que o link de confirmação retorne ao portal. O envio e a confirmação do primeiro cadastro dependem do usuário e ainda precisam de validação completa.

O controle de diárias foi copiado uma única vez da planilha. Os valores originais foram preservados em source_values, inclusive uma arrecadação com pontuação excedente normalizada para número. Estabelecimentos continuam com a consulta às planilhas. Outros módulos legados e a biblioteca de apoio mantêm exemplos demonstrativos.
