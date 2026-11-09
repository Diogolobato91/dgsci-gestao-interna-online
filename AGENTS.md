# Diretrizes e Critérios de Engenharia do Sistema DGSCI

Este documento estabelece as diretrizes de desenvolvimento, segurança, design e governança de dados para todos os agentes de IA e desenvolvedores que operam no sistema **DGSCI — Gestão e Apoio Operacional (CBMPA)**.

O sistema foi concebido e deve ser mantido estritamente em conformidade com as **7 diretrizes fundamentais** abaixo. Qualquer alteração ou nova funcionalidade deve ser validada contra estes critérios.

---

## 1. UI/UX Pro Max (Design System & Responsividade)

* **Hierarquia e Layout**:
  * Utilizar o grid base de 8px para espaçamentos, margens e preenchimentos.
  * Cabeçalho de página padronizado com título semântico, resumo operacional e botão de ação principal fixado no topo à direita.
  * Painel de dados integrado agrupando campo de busca (com normalização de diacríticos) e filtros de seleção rápida.
* **Tabelas e Paginação**:
  * Paginação estável fixada em **15 registros por página**.
  * Aplicação ou alteração de filtros deve reiniciar automaticamente a paginação para a página 1.
  * Textos extensos ou metadados complementares devem ser apresentados em modais de detalhes para manter a altura e o alinhamento das linhas estáveis.
* **Estados de Interface**:
  * Todas as telas e seções assíncronas devem tratar explicitamente quatro estados: **Carregando** (esqueletos/skeletons visuais sem layout shift), **Vazio** (ilustração/ícone, mensagem contextual amigável e ação recomendada), **Erro** (orientação clara de recuperação sem mensagens técnicas brutas) e **Conteúdo**.
  * Notificações e feedbacks imediatos de sucesso ou falha utilizando `sonner` / `toast`.

---

## 2. Vercel Web Design Guidelines & Vercel React Best Practices

* **Arquitetura de Componentes**:
  * Componentes funcionais e atômicos em TypeScript, respeitando o princípio de responsabilidade única.
  * Separação estrita entre componentes de apresentação (UI pura) e componentes de funcionalidade/regra de negócio (`features/*`).
  * Estilização baseada em utilitários Tailwind CSS estruturados através do helper `cn()` (`clsx` + `tailwind-merge`). Proibido o uso de estilos inline arbitrários.
* **Gerenciamento de Estado e Performance**:
  * Estado de servidor gerenciado exclusivamente via **TanStack Query** (`@tanstack/react-query`). Evitar duplicação desnecessária de dados em estados locais (`useState`).
  * Evitar cascatas de requisições (*waterfalls*). Carregamento sob demanda (*lazy loading*) para módulos pesados e páginas administrativas.
  * Rotas SPA com suporte direto a deep linking suportadas via configuração de redirecionamento (`public/_redirects` e `netlify.toml`).

---

## 3. Anthropic Frontend Design (Consistência & Composição Visual)

* **Identidade Visual Sóbria e Institucional**:
  * Paleta de cores oficial: Vermelho institucional (`#d32f2f` / `#b71c1c`), grafite profundo para tipografia de alto contraste (`#1e293b`), branco e superfícies cinzas suaves (`#f8fafc`).
  * Tipografia legível, com peso, kerning e entrelinha adequados para leitura operacional de relatórios e fichas.
* **Affordance e Interação**:
  * Controles interativos (botões, switches, itens de menu) com estados visíveis de `:hover`, `:active`, `:disabled` e `:focus-visible`.
  * Modais com layout consistente: cabeçalho com identificação clara, corpo com rolagem suave independente e rodapé de ações padronizado (ação secundária "Cancelar" à esquerda / ação primária de confirmação em destaque à direita).
  * Diálogos de confirmação obrigatórios para ações destrutivas ou de impacto (ex: bloqueio de usuário, rejeição de cadastro).

---

## 4. OWASP ASVS 5 & OWASP Top 10 (Segurança de Aplicação)

* **Autenticação e Senhas (ASVS V2)**:
  * O ciclo de vida de credenciais e senhas é de responsabilidade exclusiva do **Supabase Auth**. O frontend e a aplicação nunca devem coletar, trafegar ou manipular senhas em endpoints customizados.
  * Senha mínima de 8 caracteres exigida no cadastro.
* **Controle de Acesso em Nível de Linha (ASVS V4 - RLS)**:
  * Nenhuma regra de segurança deve depender unicamente do frontend. Todas as tabelas públicas **devem ter Row Level Security (RLS) habilitado**.
  * Acesso a dados condicionado à flag `app_members.enabled = true`. Usuários pendentes ou rejeitados não possuem leitura em nenhuma tabela de registros ou Storage.
* **Validação de Entrada e Defesa em Profundidade (ASVS V5)**:
  * Validação algorítmica rigorosa de CPF (módulo 11), impedindo sequências repetidas ou inválidas antes do envio.
  * No PostgreSQL, parâmetros inválidos ou incompletos devem ser rejeitados imediatamente com código SQL de erro `22023` antes de qualquer verificação administrativa.
* **Sanitização e Prevenção de Injeção (ASVS V8)**:
  * Todas as consultas parametrizadas via PostgREST/RPC, prevenindo SQL Injection.
  * Sanitização mandante de HTML via **DOMPurify** em qualquer renderização de conteúdo externo ou módulos legados incorporados (`public/arquivo/`).

---

## 5. WCAG 2.2 / W3C (Acessibilidade Digital - Nível AA)

* **Perceptível**:
  * Taxa de contraste mínima de 4.5:1 para texto padrão e 3:1 para textos grandes e elementos gráficos de interface.
  * Textos alternativos (`alt`) descritivos em logotipos e imagens essenciais; ícones meramente decorativos marcados com `aria-hidden="true"`.
* **Operável**:
  * Navegabilidade integral por teclado. Todos os menus, formulários, tabelas e modais devem responder a `Tab`, `Shift+Tab`, `Enter`, `Space` e `Escape`.
  * Utilização obrigatória de primitivas acessíveis do **Radix UI**, que garantem *focus trap* correto em diálogos e anúncios semânticos para leitores de tela.
* **Compreensível e Robusto**:
  * Campos de formulário com rótulos semânticos (`<Label>`), mensagens de erro associadas via `aria-describedby` e indicação clara de campos obrigatórios.
  * Estrutura HTML semântica (`<main>`, `<nav>`, `<header>`, `<section>`, `<article>`).

---

## 6. Supabase Secure Data (Arquitetura de Dados e Storage)

* **Princípio do Menor Privilégio**:
  * Proibido o uso de políticas permissivas cegas `USING (true)` para escrita (`INSERT`, `UPDATE`, `DELETE`).
  * Procedimentos com privilégios elevados devem residir no schema `private.*` com cláusula `SECURITY DEFINER` e configuração explícita de `SET search_path = public, private, pg_temp;`.
* **Exposição Segura de Wrappers**:
  * Funções expostas no schema `public.*` atuam apenas como wrappers de segurança, verificando a identidade do requisitante (`auth.uid()`) e suas permissões antes de delegar para o schema `private.*`.
* **Segurança de Credenciais**:
  * Apenas a chave publicável (`VITE_SUPABASE_PUBLISHABLE_KEY`) pode ser consumida pelo cliente frontend.
  * A chave privilegiada `service_role` ou senhas diretas de banco de dados **NUNCA** devem ser expostas em arquivos de código, variáveis de ambiente do frontend ou no repositório.
* **Armazenamento de Anexos (Storage)**:
  * Bucket privado `dgsci-support`, com validação de tipos MIME permitidos (PDF, Word, Excel, imagens), limite estrito de 20 MB por arquivo e RLS restrito a membros habilitados.

---

## 7. NIST Privacy Framework & LGPD (Privacidade e Governança)

* **Minimização de Dados (Identify-P / Protect-P)**:
  * Coleta restrita aos dados estritamente necessários para identificação institucional do militar: Nome completo, Posto/Graduação, Matrícula funcional, CPF, Data de nascimento e E-mail.
* **Restrição de Acesso a Dados Pessoais (PII)**:
  * CPF, matrícula e data de nascimento são restritos exclusivamente ao próprio titular e aos Superadministradores do sistema. Não são expostos em endpoints abertos ou relatórios gerais.
* **Prevenção contra Enumeração de Contas**:
  * O formulário de solicitação de cadastro deve responder com mensagens neutras e seguras em casos de duplicidade de CPF, matrícula ou e-mail (*"Os dados informados não puderam ser validados. Verifique as informações ou contate o administrador"*), impedindo que atacantes descubram quais militares possuem cadastro no sistema.
* **Rastreabilidade e Trilha de Auditoria**:
  * Todas as operações de aprovação, rejeição, bloqueio, desbloqueio e edição cadastral devem gravar registro imutável em tabela de auditoria com identificador do autor, data/hora e justificativa textual obrigatória.

---

## Regras Específicas do Domínio DGSCI / CBMPA

1. **Precedência Militar do Efetivo**:
   * A ordenação do efetivo militar deve seguir estritamente a precedência hierárquica estabelecida em [`src/lib/rankHierarchy.ts`](file:///c:/Users/V.C.%20Thiago/Documents/dgsci-gestao-interna-online/src/lib/rankHierarchy.ts):
     `CEL` $\to$ `TCEL` $\to$ `MAJ` $\to$ `CAP` $\to$ `1º TEN` $\to$ `2º TEN` $\to$ `SUB TEN RR` $\to$ `SUB TEN` $\to$ `1º SGT` $\to$ `2º SGT` $\to$ `3º SGT` $\to$ `CB` $\to$ `SD` $\to$ `VC`.
   * Para militares de mesmo posto ou graduação, o critério de desempate é rigorosamente a **ordem alfabética**.
2. **Matriz de Acesso Setorial**:
   * **Superadministrador**: Acesso total a todos os seis setores (`Diretoria`, `Subdiretoria`, `Secretaria`, `Vistoriador`, `Análise`, `Multas`) e à tela exclusiva de Gestão de Usuários (`/gestao-usuarios`).
   * **Portarias**: Acesso e edição restritos à **Subdiretoria** e ao Superadministrador. Diretoria isolada e demais setores não possuem leitura nem escrita.
   * **Comando SAT & SATs Regionais**: Consulta aberta aos habilitados; edição restrita a **Diretoria** e **Subdiretoria**.
   * **Modelos, Pareceres e Comunicados**: Consulta para habilitados; criação/edição por **Secretaria**, **Diretoria** e **Subdiretoria**.
3. **Validação Contínua**:
   * Qualquer alteração de código deve ser acompanhada da aprovação na suíte de testes:
     * `npm test` (testes unitários e de integração SQL/RLS com PGLite).
     * `npm run typecheck` (verificação de tipos TypeScript).

