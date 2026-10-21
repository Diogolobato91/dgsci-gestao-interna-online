# Escala de plantão e previsão da Administração

## Uso

Em **Administração → Escala Mensal**, as abas são:

- **Plantão:** calendário mensal e equipe do dia, composta por Chefe do Plantão, Aux. e Cond do Perito e Perito de Incêndio. O salvamento é único para a equipe completa: exige três militares distintos. VC não participa desse plantão.
- **Previsão da Administração:** matriz mensal com os contadores e marcações da planilha. Cada célula abre um editor de indicação e situação. O nome do militar abre a edição da linha; também é possível adicionar linhas e editar as observações de cada mês.

A previsão não gera automaticamente uma equipe de plantão. Os dados são copiados para o banco, sem sincronização periódica com o Google Sheets. As cores com correspondência exata na legenda recebem a respectiva classificação; outros fundos são preservados sem inferência. Os quatro primeiros dias do mês seguinte presentes na origem permanecem na previsão de outubro.

O cadastro público solicita contato com DDD. O telefone fica em `user_registrations`, não participa da autorização e não altera o fluxo de aprovação. O backend aceita a ausência do novo campo para compatibilidade com clientes antigos e contas existentes; quando informado, valida 10 ou 11 dígitos.

Ao montar a escala, o sistema consulta o contato do cadastro **aprovado e habilitado**, vinculado ao efetivo por **CPF e matrícula coincidentes**. Sem esse vínculo, utiliza o contato próprio da escala, com indicação de origem. A Administração pode editar o contato pela equipe do dia; o cadastro aprovado vinculado é atualizado na mesma transação. Contatos ausentes são exibidos como não informados.

## Banco e acesso

Migration: `supabase/roster_planning_contacts.sql`, aplicada ao projeto DGSCI como `roster_planning_and_registration_contacts`.

As tabelas `roster_people`, `plantao_roster`, `roster_plans` e `roster_plan_rows` têm RLS e privilégios explícitos. Contas habilitadas da Secretaria, Diretoria e Subdiretoria consultam e editam; os demais setores, contas pendentes e anônimos não acessam esses dados. O menu da Subdiretoria agora inclui Escala Mensal.

Os nomes abreviados de profissionais externos são preservados como informados na origem e não são acrescentados automaticamente à relação institucional do efetivo. Cadastros novos no efetivo alimentam a lista da escala por gatilho. A tabela anterior `duty_roster` foi preservada; estava vazia na conferência anterior à atualização.

Há controle de versão em equipes, linhas, observações e contatos para rejeitar edições obsoletas. Datas, composição da equipe e valores da matriz também são validados no banco. A VTR não integra esta atualização.

## Importação e validação

- Previsão de outubro de 2026: 49 linhas e 1.715 células, incluindo a extensão até 4 de novembro, legenda e observações. A data de atualização informada na origem é mantida como texto, sem tratá-la como data da importação.
- Plantão: somente a equipe efetivamente informada na aba fornecida, de 21/10/2026, com seus contatos. Não foram inventadas escalas para os demais dias.
- Os dados reais da importação e os contatos foram enviados apenas ao Supabase protegido. Arquivos de dados, credenciais e `.env.local` não integram o commit.
- Testes de formulário, composição e contatos; renderização inicial da tela; TypeScript e build de produção.
- `tests/roster-planning-rls.sql` executa gatilhos reais, regras de composição, concorrência e isolamento de acesso sob os papéis `authenticated` e `anon`, com rollback. Executado no PGlite e no Supabase remoto.
- A inspeção de segurança do Supabase não apontou novos avisos para as tabelas/funções criadas. Permanecem os avisos anteriores de proteção contra senhas vazadas e tabelas privadas sem políticas (com acesso direto revogado).

A validação interativa final no endereço publicado da Netlify permanece necessária; testes automatizados e consultas SQL não substituem a conferência visual em navegador e celular.
