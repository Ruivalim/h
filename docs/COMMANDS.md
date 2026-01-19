# Referencia de Comandos

## Indice

- [Kubernetes (h k)](#kubernetes-h-k)
- [Azure (h azs)](#azure-h-azs)
- [Git & AI (h commit, h branch-diff)](#git--ai)
- [Zsh (h z)](#zsh-h-z)
- [Release (h release)](#release-h-release)
- [Config (h config)](#config-h-config)
- [Utilitarios](#utilitarios)

---

## Kubernetes (h k)

Helpers interativos para kubectl.

### Pods

| Comando | Descricao |
|---------|-----------|
| `h k gp [name]` | Get pods (com filtro opcional) |
| `h k dlp` | Delete pod (interativo) |
| `h k exp [-c cmd] [--container name]` | Exec into pod |
| `h k dcp` | Describe pod |
| `h k lp` | Logs from pod (follow) |

### ConfigMaps

| Comando | Descricao |
|---------|-----------|
| `h k gcm` | Get configmap data (decodifica JSON) |
| `h k dcm` | Describe configmap |
| `h k dlcm` | Delete configmap |

### Secrets

| Comando | Descricao |
|---------|-----------|
| `h k gs` | Get secret data (decodifica base64) |
| `h k ds` | Describe secret |
| `h k dls` | Delete secret |

### Resources

| Comando | Descricao |
|---------|-----------|
| `h k gsa` | Get serviceaccount yaml |
| `h k gdp` | Get deployment yaml |
| `h k gep` | Get endpoints yaml |
| `h k gns` | Switch namespace (interativo) |

### Monitoring

| Comando | Descricao |
|---------|-----------|
| `h k top` | Top pods by CPU |
| `h k topn` | Top nodes by CPU |

### Debug

| Comando | Descricao |
|---------|-----------|
| `h k debug` | Cria pod de debug e abre shell |

### Azure KeyVault

| Comando | Descricao |
|---------|-----------|
| `h k gaz` | Get azurekeyvaultsecret yaml |
| `h k daz` | Describe azurekeyvaultsecret |

---

## Azure (h azs)

```bash
# Switch de subscription interativo
h azs

# Switch direto por nome ou ID
h azs "Nome da Subscription"
h azs 12345678-1234-1234-1234-123456789abc
```

**Pre-requisitos:**
- Azure CLI instalada (`az`)
- Autenticado (`az login`)

---

## Git & AI

### h commit

Gera mensagens de commit usando IA (Claude ou Ollama).

```bash
h commit           # Gera commit message
h commit --debug   # Mostra o prompt enviado para a IA
```

**Funcionalidades:**
- Detecta staged changes automaticamente
- Oferece stage all se nao houver changes
- Roda prettier e eslint (se disponiveis)
- Usa commitlint config do projeto
- Oferece opcoes: Apply, Edit, Cancel
- Opcao de push apos commit

### h branch-diff

Gera relatorio de diff entre branches usando IA.

```bash
h branch-diff           # Interativo
h branch-diff --debug   # Mostra prompt da IA
```

**Output:**
- Resumo geral
- Principais mudancas por categoria
- Arquivos impactados
- Pontos de atencao
- Recomendacoes

---

## Zsh (h z)

Gerenciador de configuracao Zsh.

| Comando | Descricao |
|---------|-----------|
| `h z list` / `h z ls` | Lista arquivos de config |
| `h z edit` / `h z e` | Edita arquivo (interativo) |
| `h z open [file]` | Abre arquivo direto |
| `h z exports [source]` | Move exports entre arquivos |
| `h z autocomplete` | Setup autocompletion para h CLI |

**Arquivos suportados:**
- `~/.zshrc`
- `~/.zshrc_paths`
- `~/.config/zsh/*.zsh`

**Aliases para `h z open`:**
- `alias` -> `~/.config/zsh/alias.zsh`
- `config` -> `~/.config/zsh/config.zsh`
- `functions` -> `~/.config/zsh/functions.zsh`
- `fzf` -> `~/.config/zsh/fzf.zsh`
- `plugins` -> `~/.config/zsh/plugins_checker.zsh`

---

## Release (h release)

Automacao completa de release.

```bash
h release           # Inicia processo de release
h release --debug   # Mostra prompts da IA
```

**Fluxo:**
1. Detecta branch atual
2. Carrega config de `.hrc` (cria se nao existir)
3. Seleciona tipo de versao (major/minor/patch/skip)
4. Atualiza versao no package.json
5. Executa pre-release hooks (format, lint, build)
6. Gera commit message (opcional com IA)
7. Cria commit e tag
8. Gera release notes (opcional com IA)
9. Atualiza CHANGELOG.md
10. Push para remote
11. Cria GitHub Release (se gh CLI disponivel)
12. Executa post-release hooks

**Rollback automatico** se cancelado ou erro.

### Configuracao `.hrc`

```json
{
  "release": {
    "versionFile": "package.json",
    "preRelease": [
      "bun run format",
      "bun run lint",
      "bun run build"
    ],
    "postRelease": [
      "# npm publish",
      "# docker push"
    ]
  }
}
```

---

## Config (h config)

Gerencia configuracoes da CLI.

| Comando | Descricao |
|---------|-----------|
| `h config show` | Mostra configuracao atual |
| `h config edit` | Edita no editor padrao |
| `h config set-ai` | Configura provider IA (Claude/Ollama) |
| `h config set-updates` | Configura verificacao de updates |
| `h config reset` | Reset para defaults |

**Arquivo:** `~/.h.config.json`

### Exemplo de Configuracao

```json
{
  "ai": {
    "provider": "claude",
    "ollama": {
      "model": "llama3.2",
      "baseUrl": "http://localhost:11434"
    }
  },
  "updates": {
    "checkOnStartup": true
  }
}
```

---

## Utilitarios

### Sistema

| Comando | Descricao |
|---------|-----------|
| `h ip` | Mostra IP publico e info de localizacao |
| `h upgrade` / `h update` | Atualiza h CLI para ultima versao |
| `h uninstall` | Desinstala h CLI |

### Docker

| Comando | Descricao |
|---------|-----------|
| `h oxker` | Abre Docker TUI interativo |

### Brew (macOS)

| Comando | Descricao |
|---------|-----------|
| `h update-abi` | Backup de brew formulas/casks |

### Editores

| Comando | Descricao |
|---------|-----------|
| `h edit-nvim` | Abre config do neovim |
| `h edit-zsh` | Abre config do zsh |

### macOS Only

| Comando | Descricao |
|---------|-----------|
| `h unquarantine [app]` | Remove quarantine de app |

### Linux (Hyprland) Only

| Comando | Descricao |
|---------|-----------|
| `h screen-reset` | Reset resolucao |
| `h screen-fhd` | Seta resolucao 1080p |

---

## Flags Globais

| Flag | Descricao |
|------|-----------|
| `--help` | Mostra ajuda |
| `--version` | Mostra versao |
