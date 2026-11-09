# DGSCI — Gestão e Apoio Operacional

Portal público e sistema interno do Departamento-Geral de Segurança Contra Incêndios e Emergências do CBMPA.

A plataforma reúne informações institucionais, atendimento por chat e filas, consulta de credenciados, cartilhas e Instruções Técnicas. O ambiente autenticado inclui estabelecimentos, SATs, biblioteca, escalas, efetivo, projetos, autos, Comissão Técnica, relatórios, autorizações, publicações, usuários e auditoria.

## Documentação

- [Documentação completa e auditoria atualizada](docs/DOCUMENTACAO_COMPLETA_E_AUDITORIA_2026.md)
- [PDF diagramado](docs/DOCUMENTACAO_COMPLETA_E_AUDITORIA_2026.pdf)
- [Privacidade, retenção e incidentes](docs/PRIVACIDADE_RETENCAO_E_INCIDENTES.md)
- [Atendimento on-line](docs/ATENDIMENTO_ONLINE.md)
- [Perfis e permissões](docs/PERFIS_E_PERMISSOES.md)
- [Arquivamento e auditoria](docs/ARQUIVAMENTO_E_AUDITORIA.md)

## Stack

- React 18, TypeScript, Vite e React Router
- Radix UI, Tailwind e componentes próprios
- Supabase Auth, PostgreSQL/RLS, Storage, Realtime e Edge Functions
- Netlify

## Preparar o ambiente

Use Node.js 22 e mantenha credenciais apenas nas variáveis locais ou nos painéis do provedor.

```bash
npm ci
npm run dev
```

Variáveis obrigatórias:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Nunca versione `.env.local`, senha do banco, chave de serviço ou token pessoal.

## Validar

```bash
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
npm run build
```

O workflow [Portal checks](.github/workflows/portal-checks.yml) executa essas verificações em pull requests e em envios para `main`. Os testes `tests/*-rls.sql` podem ser executados em um banco exclusivo de homologação por meio do secret `SUPABASE_TEST_DB_URL`. Nunca aponte esse secret para a produção.

## Banco e funções

As migrations estão em `supabase/migrations`. Aplique-as em homologação, execute os testes RLS e depois publique em produção na mesma ordem. As Edge Functions ficam em `supabase/functions`.

```bash
npx supabase db push
npx supabase functions deploy support-chat
npx supabase functions deploy accreditation-sheet
```

## Deploy e rollback

O frontend é publicado pela Netlify a partir da `main`. Para rollback, restaure um deploy anterior na Netlify. Migrations são incrementais: não edite migrations já publicadas e crie uma nova migration corretiva quando necessário. Antes de mudanças destrutivas, gere backup e valide a restauração em homologação.

## Estado dos módulos

Projetos, Gestão de Autos, Relatórios e Comissão Técnica possuem implementação operacional com autorização por setor, RLS, auditoria e controle de concorrência. A homologação final do conteúdo e dos fluxos continua sob responsabilidade dos setores da DGSCI.
