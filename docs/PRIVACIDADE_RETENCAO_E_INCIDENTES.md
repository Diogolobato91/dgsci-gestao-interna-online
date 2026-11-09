# Privacidade, retenção e resposta a incidentes

Versão operacional de 8 de novembro de 2026. A Subdiretoria deve revisar esta tabela anualmente e adequá-la à tabela de temporalidade do CBMPA e às determinações do arquivo público.

## Princípios

- Coletar somente os dados necessários à atividade.
- Limitar o acesso por função e setor.
- Manter histórico suficiente para continuidade, auditoria e obrigação legal.
- Não copiar dados pessoais para mensageria informal.
- Registrar exportações e alterações relevantes.
- Eliminar ou anonimizar dados ao terminar o prazo, salvo bloqueio legal ou administrativo.

## Prazos operacionais

| Dados | Prazo inicial | Destino ao final |
|---|---:|---|
| Limites técnicos de requisição do chat | 24 horas | Exclusão automática |
| Avaliação de satisfação | 2 anos após encerramento | Anonimização estatística |
| Atendimento, mensagens e anexos | 5 anos após encerramento | Revisão para exclusão ou preservação no processo relacionado |
| Solicitação de cadastro rejeitada | 1 ano | Exclusão dos dados de solicitação, preservando evento mínimo de auditoria |
| Auditoria de alterações | 5 anos | Revisão conforme obrigação de controle |
| Documentos de processos, portarias, efetivo, escalas e autorizações | Conforme tabela de temporalidade e obrigação funcional | Arquivamento ou eliminação autorizada |

Um processo administrativo, ordem judicial, apuração ou obrigação legal suspende a eliminação do registro relacionado.

## Direitos e solicitações

Pedidos de informação, correção e revisão devem ser registrados pelo atendimento do portal. A equipe confirma identidade e legitimidade antes de fornecer dados ou alterar cadastro. A resposta deve informar o que foi atendido, a justificativa para eventual preservação e o canal de recurso.

## Incidente de segurança

1. Registrar data, ambiente, usuário afetado e evidência.
2. Conter o acesso sem apagar logs.
3. Revogar sessões, links e credenciais afetadas.
4. Identificar dados, titulares, período e alcance.
5. Corrigir em homologação, testar e preparar rollback.
6. Comunicar a gestão e avaliar obrigações perante titulares e ANPD.
7. Documentar causa, impacto e ação preventiva.

## Backup e restauração

- Executar backup diário do banco e manter cópia protegida fora do ambiente primário.
- Definir RPO de 24 horas e RTO inicial de 8 horas.
- Testar restauração trimestralmente com dados protegidos.
- Registrar duração, falhas, tabelas verificadas e responsável pelo teste.
- Restaurar primeiro em ambiente isolado; conferir RLS antes de liberar acesso.
