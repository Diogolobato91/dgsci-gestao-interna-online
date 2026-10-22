# Avisos de comunicados e correção cadastral

## Novos comunicados

A publicação de um comunicado institucional novo gera um evento, também para seu autor. Comunicados demonstrativos e modelos não geram aviso; converter uma demonstração em comunicado institucional gera uma única publicação. Editar o texto não recria o evento. Os comunicados anteriores à instalação não são publicados retroativamente.

O portal verifica avisos ao entrar, ao retornar à janela e a cada 30 segundos enquanto a página está visível. Após o próprio usuário cadastrar um comunicado, verifica novamente assim que o editor fecha. Não são notificações do sistema operacional: o portal precisa estar aberto. Uma janela de edição ou consulta já aberta adia o aviso para evitar sobreposição.

O aviso mostra uma prévia, **Ler comunicado** e **Depois**. Abrir a leitura ou dispensar registra no banco que aquele usuário recebeu o aviso. Depois não agenda um novo pop-up; o conteúdo continua disponível em Comunicados. A leitura completa e os anexos podem ser acessados na própria janela. O recibo é individual e vale em outros dispositivos. Uma edição posterior não apaga os recibos.

As tabelas de publicação e recibos têm RLS. Usuários só registram e consultam seus próprios recibos. Contas pendentes/bloqueadas e visitantes não recebem conteúdo. Eventos só podem ser criados pelo gatilho do documento; não há escrita direta de publicações pelo cliente.

## Dados pessoais

Em **Gestão de Usuários → Editar**, o superadministrador corrige nome, posto/graduação, matrícula, CPF, nascimento e contato. Dados desconhecidos podem permanecer em branco. O e-mail de autenticação e a senha não são modificados por essa ação.

A RPC verifica o superadministrador ativo no banco, valida CPF, graduação, nascimento, telefone e duplicidades, usa versão contra sobrescrita concorrente e registra antes/depois na auditoria privada. Atualiza o nome exibido nas fontes de acesso. A situação, a aprovação, os setores e as permissões permanecem intactos, inclusive em contas pendentes ou bloqueadas.

A ação corrige o cadastro da conta; não associa automaticamente contas ao efetivo por nome, nem reescreve registros históricos de escala.

## Instalação e testes

Migrations: `supabase/notices_and_personal_data.sql` e `supabase/unified_user_edit.sql`. O formulário Editar salva dados pessoais e permissões numa transação; falhas revertem ambas as partes. Cadastros pendentes ou rejeitados permitem corrigir a identificação, mantendo Aprovar/Reavaliar como ação obrigatória para concessão de acesso.
Suíte transacional: `tests/notices-personal-data-rls.sql`, incluída no teste PostgreSQL/PGlite. Os testes conferem correção cadastral, preservação da pendência, auditoria, CPF inválido/duplicado, versão obsoleta, isolamento de recibos e bloqueio de acessos não autorizados.
