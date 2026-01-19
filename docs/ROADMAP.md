# Roadmap de Desenvolvimento

Este documento apresenta o plano de evolucao da CLI h, organizado em fases.

---

## Fase 1: Estabilizacao (v0.6.0)

**Objetivo:** Corrigir problemas criticos e melhorar qualidade de codigo.

### Correcoes Criticas

- [ ] **Fix variable shadowing em misc.ts:90**
  - Renomear variavel `info` para `ipInfo`
  - Arquivo: `src/commands/misc.ts`

- [ ] **Adicionar verificacao de exit code em utils/exec.ts**
  - Verificar `result.exitCode` apos execucao
  - Lancar erro se comando falhar
  - Arquivo: `src/utils/exec.ts`

- [ ] **Corrigir try/catch vazio em release.ts**
  - Tratar erros especificos
  - Arquivo: `src/commands/release.ts`

### Melhorias de Codigo

- [ ] **Dividir misc.ts em modulos menores**
  - `src/commands/git.ts` - commit, branch-diff
  - `src/commands/system.ts` - ip, upgrade, uninstall
  - `src/commands/docker.ts` - oxker
  - `src/commands/editors.ts` - edit-nvim, edit-zsh

- [ ] **Atualizar autocomplete em zsh.ts**
  - Listar todos os 20+ comandos k
  - Adicionar novos comandos

### Testes

- [ ] **Setup de testes com bun test**
  - Configurar estrutura de testes
  - Adicionar testes para utils/

- [ ] **Testes unitarios para funcoes criticas**
  - `utils/exec.ts`
  - `utils/config.ts`
  - `utils/release-notes.ts`

**Estimativa:** v0.6.0

---

## Fase 2: UX & Cross-Platform (v0.7.0)

**Objetivo:** Melhorar experiencia do usuario e suporte cross-platform.

### Cross-Platform

- [ ] **Suporte a clipboard em Linux**
  - Detectar xclip ou xsel
  - Fallback com mensagem de instalacao

- [ ] **Suporte a clipboard em Windows**
  - Usar comando clip
  - Testar em Windows

- [ ] **Editor configuravel**
  - Usar $EDITOR ou $VISUAL
  - Fallback para nvim

### UX

- [ ] **Progress bars para operacoes longas**
  - AI generation
  - Git operations
  - Network requests

- [ ] **Timeout configuravel para Ollama**
  - Adicionar AbortController
  - Config em ~/.h.config.json

- [ ] **Mensagens de erro mais claras**
  - Detectar problemas comuns
  - Sugerir solucoes

### Configuracao

- [ ] **Mover config para XDG-compliant path**
  - `~/.config/h/config.json`
  - Migracao automatica do path antigo

**Estimativa:** v0.7.0

---

## Fase 3: Cloud Providers (v0.8.0)

**Objetivo:** Expandir suporte para outros cloud providers.

### AWS

- [ ] **Comando h aws**
  - `h aws profile` - Switch de profile
  - `h aws region` - Switch de regiao
  - `h aws s3 ls` - Listar buckets
  - `h aws ec2 ls` - Listar instancias

### Google Cloud

- [ ] **Comando h gcp**
  - `h gcp project` - Switch de projeto
  - `h gcp config` - Configuracoes
  - `h gcp gke` - Helpers para GKE

### Melhorias Kubernetes

- [ ] **Cache de recursos kubectl**
  - Cache local de pods, deployments, etc.
  - Invalidacao automatica

- [ ] **Context manager**
  - `h k ctx` - Switch de context
  - Integracao com kubectx

**Estimativa:** v0.8.0

---

## Fase 4: IA Avancada (v0.9.0)

**Objetivo:** Expandir capacidades de IA.

### Novos Providers

- [ ] **Suporte a OpenAI**
  - API key em config
  - Modelos configuráveis (gpt-4, gpt-3.5)

- [ ] **Suporte a Gemini**
  - Google AI integration
  - API key management

### Novas Features

- [ ] **AI Code Review**
  - `h review` - Review de staged changes
  - Sugestoes de melhoria

- [ ] **AI Documentation**
  - `h docs` - Gera documentacao
  - Analisa funcoes e gera JSDoc

- [ ] **AI Refactor Suggestions**
  - Sugestoes de refatoracao
  - Deteccao de code smells

**Estimativa:** v0.9.0

---

## Fase 5: Extensibilidade (v1.0.0)

**Objetivo:** Tornar a CLI extensivel por plugins.

### Sistema de Plugins

- [ ] **Plugin API**
  - Interface para criar plugins
  - Registro de comandos customizados

- [ ] **Plugin Manager**
  - `h plugin install <name>`
  - `h plugin list`
  - `h plugin remove <name>`

- [ ] **Plugin Repository**
  - Registry de plugins
  - Verificacao de seguranca

### Outras Features

- [ ] **Historico de comandos**
  - Armazenar comandos executados
  - `h history`

- [ ] **Aliases customizados**
  - Definir aliases via config
  - `h alias add <name> <command>`

- [ ] **Temas/cores configuraveis**
  - Presets de cores
  - Customizacao via config

**Estimativa:** v1.0.0

---

## Backlog (Futuro)

### Nice to Have

- [ ] Shell integration profunda (tmux, screen)
- [ ] Notificacoes desktop
- [ ] Sincronizacao de config via cloud
- [ ] TUI mode (full terminal UI)
- [ ] REST API para integracao
- [ ] VSCode extension
- [ ] Neovim plugin

### Comunidade

- [ ] Contributing guide
- [ ] Issue templates
- [ ] Plugin showcase
- [ ] Documentacao interativa

---

## Prioridades por Versao

| Versao | Foco Principal | Status |
|--------|---------------|--------|
| v0.5.1 | Release fixes | Atual |
| v0.6.0 | Estabilizacao | Planejado |
| v0.7.0 | UX & Cross-Platform | Planejado |
| v0.8.0 | Cloud Providers | Planejado |
| v0.9.0 | IA Avancada | Planejado |
| v1.0.0 | Extensibilidade | Planejado |

---

## Como Contribuir

1. Escolha um item do roadmap
2. Abra uma issue para discussao
3. Submeta um PR com a implementacao
4. Aguarde review

Consulte o arquivo [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) para detalhes tecnicos dos problemas identificados.
