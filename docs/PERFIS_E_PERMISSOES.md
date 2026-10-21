# Perfis e permissões DGSCI

Perfis de setor: Vistoriador, Análise, Multas, Secretaria, Subdiretoria e Diretoria. ADM foi renomeado para Secretaria e Vistoria para Vistoriador, inclusive associações no banco e políticas anteriores. Superadministrador é a conta com função administrator e todos os seis setores; preserva acesso completo.

| Módulo | Consulta | Criar / alterar |
| --- | --- | --- |
| CMT e SUB SAT'S | Contas habilitadas | Diretoria e Subdiretoria (alterar) |
| SAT's Regionais | Contas habilitadas | Diretoria e Subdiretoria |
| Comunicados | Contas habilitadas | Secretaria, Diretoria e Subdiretoria |
| Ajuda rápida | Contas habilitadas | Secretaria, Diretoria e Subdiretoria |
| Modelos padronizados, incluindo autos de infração | Contas habilitadas | Secretaria, Diretoria e Subdiretoria |
| Controle de Portarias | Subdiretoria e superadministrador | Subdiretoria e superadministrador |

O superadministrador participa das permissões de todos os setores. As decisões usam associações protegidas no banco, nunca metadados editáveis pelo usuário. As tabelas e o Storage têm políticas RLS. Anexos em bucket privado dgsci-support, limite de 20 MB, formatos PDF, Word, Excel, imagens e texto. Exclusão de anexo da ficha retira sua referência; não apaga fisicamente arquivos já persistidos, preservando vínculos de outras versões.

Dados de demonstração anteriores (12 conteúdos e 27 SATs regionais) foram mantidos no banco com marcação explícita. Não são dados oficiais. Os editores podem validar e desmarcar a identificação de demonstração. Os 33 comandos SAT importados da planilha permanecem dados de origem; nenhuma coluna de contato pessoal ou funcional foi adicionada.

Edições utilizam versões para prevenir sobrescrita concorrente. Uploads novos que falham ao salvar o conteúdo são removidos quando possível. Nenhum dado real ou arquivo de ambiente é incluído no GitHub.

Validação: testes unitários dos perfis/menus, transações de RLS com os seis setores, superadministrador, conta desabilitada e anônimo, incluindo metadados de anexos. A revisão visual no navegador e um upload completo pelo portal permanecem dependentes de validação na sessão do usuário.
