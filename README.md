# DGSCI — Gestão e Apoio Operacional

Portal público e sistema interno do Departamento-Geral de Segurança Contra Incêndios e Emergências do CBMPA.

A aplicação reúne serviços e orientações públicas, atendimento por chat e filas, consulta de credenciados, cartilhas e Instruções Técnicas, além de módulos internos para usuários, estabelecimentos, SATs, biblioteca, escalas, efetivo, documentos, autorizações e auditoria.

## Documentação

- [Documentação completa e auditoria de 2026](docs/DOCUMENTACAO_COMPLETA_E_AUDITORIA_2026.md)
- [PDF diagramado](docs/DOCUMENTACAO_COMPLETA_E_AUDITORIA_2026.pdf)
- [Atendimento on-line](docs/ATENDIMENTO_ONLINE.md)
- [Perfis e permissões](docs/PERFIS_E_PERMISSOES.md)
- [Arquivamento e auditoria](docs/ARQUIVAMENTO_E_AUDITORIA.md)

## Stack

- React 18, TypeScript e Vite
- React Router, Radix UI e Tailwind
- Supabase Auth, PostgreSQL/RLS, Storage, Realtime e Edge Functions
- Netlify

## Executar localmente

```bash
npm ci
npm run dev
```

As variáveis do Supabase ficam em `.env.local` e não devem ser versionadas.

## Verificar

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Os testes SQL/RLS existentes também devem ser executados antes de migrations ou mudanças de permissão. Consulte a auditoria para os bloqueadores atuais e os critérios de aceite para produção ampliada.

## Estado dos módulos

Projetos, Gestão de Autos, Relatórios e Comissão Técnica ainda exibem o módulo pendente. Eles não devem ser apresentados como concluídos até a homologação dos respectivos setores.

Nenhuma credencial, arquivo `.env.local` ou base real deve ser enviada ao GitHub.
