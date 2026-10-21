# Atualização operacional

- Login aprovado sempre redireciona a `/dashboard`, sem restaurar a rota de outro usuário.
- Comando das SATs e SATs Regionais exibem todos os registros da consulta em uma lista.
- Autorizações: consolidado financeiro, comparação por origem, situação dos processos e referência de saldo selecionável. Os saldos importados não são somados nem recalculados como se fossem um livro contábil. Campos vazios são identificados; edição recarrega os totais.
- Protocolos podem ser editados pela Subdiretoria e pelo superadmin, com RLS e atualização condicionada à data da versão lida. O gatilho atualiza a marca temporal.
- Exclusão de contas: Edge Function `delete-account`, validação do JWT e do superadmin pelo banco, confirmação do e-mail, bloqueio prévio e exclusão irreversível no Supabase Auth com `shouldSoftDelete=true`. Registros de autenticação são anonimizados pelo Auth; cadastro do portal e allowlist são removidos; auditoria preservada. Autoexclusão e remoção do último superadmin são barradas. Nenhuma chave administrativa no frontend.
- Se a API de exclusão falhar após o bloqueio, a conta permanece bloqueada e a interface informa a falha. Uma falha de finalização após exclusão requer intervenção administrativa; não apresenta sucesso indevido.

Backend aplicado no projeto DGSCI: `portal_finance_and_account_deletion`; Edge Function versão 1. Testes transacionais no banco com rollback passaram, incluindo permissões financeiras, conflito de edição, negação da finalização ao cliente e limpeza de fixture após simulação do estado excluído no Auth. O teste SQL não chama a API Auth de exclusão.

Validação local: TypeScript, 28 testes automatizados e build. Não foi realizada validação visual no navegador nem exclusão de uma conta real.
