# Guia de Instalacao

## Pre-requisitos

### Obrigatorios

- **macOS** (arm64) ou **Linux** (x64)
- **Git** - Para operacoes de versionamento

### Opcionais (dependendo dos comandos usados)

| Ferramenta | Comandos que usam |
|------------|------------------|
| `kubectl` | `h k *` |
| `az` (Azure CLI) | `h azs` |
| `claude` (Claude CLI) | `h commit`, `h release` (com AI) |
| `nvim` | `h edit-*`, `h z edit` |
| `bat` | `h k top`, `h k topn` |
| `gh` (GitHub CLI) | `h release` (GitHub Release) |
| `docker` | `h oxker` |

---

## Instalacao

### Via Script (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/Ruivalim/h/main/install.sh | bash
```

### Via GitHub Releases

1. Baixe o binary para sua plataforma:
   - macOS (arm64): `h-darwin-arm64`
   - Linux (x64): `h-linux-x64`

2. Mova para um diretorio no PATH:
```bash
mv h-darwin-arm64 ~/.local/bin/h
chmod +x ~/.local/bin/h
```

3. Verifique a instalacao:
```bash
h --version
```

### Via Zsh Function (Auto-install)

Adicione ao seu `~/.zshrc`:

```bash
h() {
  local H_BIN="$HOME/.local/bin/h"
  local H_VERSION_FILE="$HOME/.local/bin/.h_version"
  local H_REPO="Ruivalim/h"

  # Auto-install if not present
  if [[ ! -f "$H_BIN" ]]; then
    echo "Installing h CLI..."
    mkdir -p "$HOME/.local/bin"

    # Detect platform
    local artifact=""
    case "$(uname -s)-$(uname -m)" in
      Darwin-arm64) artifact="h-darwin-arm64" ;;
      Linux-x86_64) artifact="h-linux-x64" ;;
      *) echo "Unsupported platform"; return 1 ;;
    esac

    local latest=$(curl -s "https://api.github.com/repos/$H_REPO/releases/latest" | grep tag_name | cut -d'"' -f4)
    curl -fsSL "https://github.com/$H_REPO/releases/download/$latest/$artifact" -o "$H_BIN"
    chmod +x "$H_BIN"
    echo "$latest" > "$H_VERSION_FILE"
    echo "Installed h CLI $latest"
  fi

  "$H_BIN" "$@"
}
```

---

## Configuracao Inicial

### 1. Configurar Provider de IA

```bash
# Usar Claude (padrao)
h config set-ai
# Selecione "Claude Code CLI"

# Ou usar Ollama local
h config set-ai
# Selecione "Ollama (local)"
# Configure model e URL
```

### 2. Configurar Verificacao de Updates

```bash
h config set-updates
# Escolha se quer verificar updates no startup
```

### 3. Ver Configuracao Atual

```bash
h config show
```

---

## Configuracao por Projeto

### Release Hooks (.hrc)

Crie um arquivo `.hrc` na raiz do projeto:

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
      "# npm publish"
    ]
  }
}
```

### Commitlint

A CLI respeita a configuracao de commitlint do projeto:
- `commitlint.config.js`
- `.commitlintrc.json`
- `package.json` (campo "commitlint")

---

## Atualizacao

```bash
# Atualizar para ultima versao
h upgrade

# Ou
h update
```

---

## Desinstalacao

```bash
h uninstall
```

Isso remove:
- `~/.local/bin/h`
- `~/.local/bin/.h_version`

**Nota:** O arquivo de configuracao `~/.h.config.json` nao e removido automaticamente.

---

## Solucao de Problemas

### "Command not found: h"

Verifique se `~/.local/bin` esta no PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### "Azure CLI is not installed"

Instale o Azure CLI:
```bash
# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### "Claude CLI not found"

Instale o Claude CLI:
```bash
# Siga instrucoes em: https://docs.anthropic.com/claude-cli
```

### "kubectl not found"

Instale o kubectl:
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl ~/.local/bin/
```

### Ollama nao responde

Verifique se o Ollama esta rodando:
```bash
ollama serve
```

E configure a URL correta:
```bash
h config set-ai
# Selecione Ollama
# Base URL: http://localhost:11434
```

---

## Proximos Passos

1. Explore os comandos: `h --help`
2. Configure o kubectl: `h k gns`
3. Faca seu primeiro commit com AI: `h commit`
