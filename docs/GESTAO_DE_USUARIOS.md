# Gestão de Usuários
Módulo exclusivo do superadministrador (função administrator e todos os seis setores). Usa a associação protegida no banco e uma verificação independente em cada operação administrativa.

## Fluxo
1. O gestor cadastra nome, e-mail e setores. A criação adiciona uma autorização, não uma conta Auth com senha compartilhada.
2. A pessoa abre /login, escolhe Primeiro acesso, define sua senha e confirma o e-mail.
3. A tela informa ativo, bloqueado, aguardando primeiro acesso ou aguardando confirmação.
4. Nome, setores, permissão de superadministrador e liberação podem ser alterados. E-mail é a chave imutável deste fluxo.
5. Bloquear desabilita a associação imediatamente no banco. Tokens antigos continuam sem acesso aos dados protegidos; o cliente revalida as permissões ao voltar à janela e a cada 60 segundos.
6. Cadastro e alterações de acesso são registrados em auditoria privada, sem senhas.

## Proteções
- Chamadas administrativas negadas a usuário comum, conta bloqueada e anônimo.
- E-mail normalizado; nome e setores validados no servidor.
- Versão evita sobrescrita concorrente.
- Superadministrador não pode bloquear ou rebaixar a própria conta.
- Verificação de superadministrador ativo e serialização de alterações para evitar perda do último gestor.
- Confirmação de e-mail preservada. Nenhum endpoint confirma contas ou altera senhas.
- Enrollment e gestão usam a mesma trava para impedir reativação por confirmação concorrente.
- Funções privilegiadas no schema private, search_path vazio e verificação de auth.uid(); endpoints públicos são wrappers invoker.
- Nenhuma chave privilegiada no cliente, GitHub ou arquivo de ambiente público.

## Arquivos e validação
- supabase/user_management.sql: expansão do esquema e funções.
- tests/user-management-rls.sql: fixtures sintéticas e verificações, revertidas ao final.
- tests/user-management.test.mjs: teste de renderização negada e classificação de perfis.
- CI sem segredos: instalação, TypeScript, testes e build. Não publica o site.

A implementação foi preparada com o ambiente de execução local indisponível. A sincronização da fonte privada de Sites e a publicação dependem da recuperação desse ambiente. Não afirmar que a nova tela está publicada antes dessa etapa. A confirmação/redirecionamento do primeiro acesso continua seguindo a configuração Auth existente.
