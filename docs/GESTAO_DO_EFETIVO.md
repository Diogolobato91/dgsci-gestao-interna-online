# Gestão do efetivo e disponibilidade

## Acesso e cadastro

Secretaria, Diretoria e Subdiretoria gerenciam o módulo em **Administração → Relação de Efetivo**. A permissão é conferida no banco para todas as operações; o cadastro de um integrante não cria uma conta nem concede acesso ao portal.

A tela permite incluir e editar nome, posto/graduação, matrícula, CPF, nascimento e contato. Os campos desconhecidos permanecem vazios. A categoria é derivada da graduação: VC ou militar. O CPF é parcialmente exibido na lista e pode ser conferido no editor autorizado. A consulta continua ordenada pela sequência institucional e por nome dentro de cada graduação.

Nome e graduação são sincronizados com a lista de integrantes da escala. O contato é atualizado também no cadastro de acesso aprovado quando CPF e matrícula identificam o mesmo integrante. Limpar o contato remove o telefone desse vínculo; não altera senha, setores nem permissões.

Há verificação de CPF, nascimento, contato e duplicidades normalizadas de CPF/matrícula no servidor. Um CPF legado inválido, se não for modificado, não impede uma atualização de outro campo. Não é possível converter para VC alguém ainda vinculado a um plantão futuro; a equipe deve ser revisada primeiro.

## Férias, licenças e afastamentos

O botão **Férias e afastamentos** abre o histórico geral, com filtro por integrante. Cada linha do efetivo também oferece a ação **Afastamentos**.

O registro informa tipo, início, término e motivo/referência administrativa opcional. O primeiro e o último dia fazem parte do período. Dois períodos ativos do mesmo integrante não podem se sobrepor. Registros podem ser editados ou cancelados com justificativa. O cancelamento preserva o registro, autor e data; não há exclusão do histórico nem reativação por edição.

A data de consulta de disponibilidade pode ser alterada na relação de efetivo. A disponibilidade exibida considera apenas os períodos estruturados cadastrados no módulo. As observações importadas da planilha de previsão continuam preservadas, sem transformação automática em afastamentos e sem criação de dados fictícios.

## Integração com o plantão

- Registrar um afastamento informa os plantões existentes no período, sem apagar suas equipes.
- A escala mensal destaca os dias que precisam de revisão e mostra o tipo/período do afastamento nos integrantes afetados.
- O editor identifica as opções indisponíveis, explica o conflito quando um militar já selecionado está afastado e exige corrigir a equipe antes do salvamento.
- O banco também recusa o salvamento de um plantão com integrante afastado, independentemente da interface.
- Profissionais sem vínculo com o efetivo continuam identificados como tal e exigem conferência pela Administração. Nenhum vínculo é inferido por nome de guerra.
- A previsão administrativa mantém seus contadores e marcações originais; não é sobrescrita pelos afastamentos nem convertida automaticamente em equipes de plantão.

## Implementação e validação

Migration criada pela CLI oficial: `supabase/migrations/20261021202330_staff_management.sql`, aplicada ao projeto DGSCI como `staff_management`.

`staff_absences` usa RLS e privilégios explícitos, sem acesso de leitura/escrita para anônimos, contas pendentes, bloqueadas ou setores não autorizados. Alterações do cadastro passam pela RPC validada `save_staff_member`; a escrita direta na tabela do efetivo e nos vínculos da escala foi revogada. Funções privilegiadas ficam no schema privado e verificam a conta habilitada e os setores no banco.

Equipes e afastamentos usam o mesmo bloqueio transacional por integrante para serializar verificações de disponibilidade. Edições da interface usam versões para detectar registros obsoletos. Datas de referência seguem o fuso de Fortaleza/Belém, inclusive durante a virada do dia em UTC.

Validações executadas: testes unitários de períodos, limites inclusivos, cancelamento e fuso; testes SQL em PostgreSQL/PGlite e no Supabase sob os papéis `authenticated` e `anon`, sempre com rollback; regressão do cadastro/aprovação e da escala anterior; renderização inicial, TypeScript e build. Os testes não enviam e-mails nem deixam contas ou dados fictícios no banco.

A conferência interativa no endereço publicado da Netlify continua necessária. As chaves de ambiente, os dados reais e os arquivos temporários de validação não integram o repositório público.
