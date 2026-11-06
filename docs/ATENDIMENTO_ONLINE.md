# Atendimento on-line DGSCI

O atendimento será realizado por um chat próprio do portal. WhatsApp não faz parte do fluxo. O cliente informa o CNPJ, confirma um contato e escolhe o serviço; o servidor deriva a fila a partir do catálogo oficial e cria um protocolo.

## Filas

- Seção de Vistoria
- Seção de Multa
- Seção de Análise de Projeto
- Seção de Credenciamento de Empresas e Profissionais
- Acesso e Senha, atendida por todos os VCs disponíveis

A posição considera somente chamados `queued` da mesma fila criados anteriormente. Chamados já atribuídos não são somados como pessoas aguardando. As filas não compartilham posição.

## Distribuição

Cada VC é configurado para uma ou mais seções e possui capacidade fixa de cinco atendimentos não encerrados. A distribuição escolhe o atendente elegível com menos chamados ativos; empates favorecem quem está há mais tempo sem receber uma atribuição. A operação usa bloqueio transacional para impedir que solicitações concorrentes ultrapassem a capacidade.

Os estados que ocupam vaga são `assigned`, `in_progress` e `waiting_customer`. Ao concluir ou cancelar um atendimento, o sistema atribui ao mesmo VC o chamado mais antigo entre suas filas autorizadas. A fila Acesso e Senha é elegível para todos os VCs ativos.

## Acesso e privacidade

O CNPJ identifica a empresa, mas não autentica o solicitante. Ao abrir o atendimento, a plataforma gera um protocolo e uma chave de acesso exibida uma única vez; somente o hash dessa chave é armazenado. O cliente usa CNPJ, protocolo e chave para voltar à conversa. Não há confirmação por e-mail. O telefone permanece apenas como contato e o atendimento ocorre exclusivamente no chat do portal.

VCs consultam apenas os chamados atribuídos a eles. Diretoria e Subdiretoria podem consultar a operação completa e configurar as filas dos atendentes. As tabelas não permitem leitura anônima nem escrita direta pelo navegador; operações públicas serão mediadas por uma Edge Function com limitação de requisições.

## Estruturas implementadas

- `support_queues` e `support_services`: catálogo controlado pelo servidor.
- `support_agents`: filas, disponibilidade e capacidade do VC.
- `support_tickets`: protocolo, identificação, situação e responsável.
- `support_messages`: mensagens do chat próprio.
- `support_ticket_events`: auditoria de criação, atribuição, mensagens e encerramento.
- RPCs internas para configurar atendentes, distribuir chamados, enviar mensagens, alterar situação e consultar a caixa de atendimento.

`support_tickets` e `support_messages` são adicionadas à publicação Realtime quando ela existe no projeto Supabase.
