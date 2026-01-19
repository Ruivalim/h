# Documentacao do H CLI

Bem-vindo a documentacao do **h** CLI - uma ferramenta de linha de comando para auxiliar em workflows de desenvolvimento.

## Indice

| Documento | Descricao |
|-----------|-----------|
| [INSTALLATION.md](./INSTALLATION.md) | Guia de instalacao e configuracao |
| [COMMANDS.md](./COMMANDS.md) | Referencia completa de comandos |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura e estrutura do projeto |
| [ISSUES_AND_IMPROVEMENTS.md](./ISSUES_AND_IMPROVEMENTS.md) | Problemas identificados e melhorias |
| [ROADMAP.md](./ROADMAP.md) | Plano de evolucao do projeto |

## Quick Start

```bash
# Instalar
curl -fsSL https://raw.githubusercontent.com/Ruivalim/h/main/install.sh | bash

# Ver comandos disponiveis
h --help

# Configurar IA
h config set-ai

# Fazer commit com AI
h commit
```

## Comandos Principais

```bash
# Kubernetes helpers
h k gp              # Get pods
h k exp             # Exec into pod
h k lp              # Logs from pod

# Azure
h azs               # Switch subscription

# Git + AI
h commit            # AI-powered commit message
h branch-diff       # AI-powered diff report

# Release
h release           # Automated release workflow

# Zsh config
h z ls              # List zsh configs
h z edit            # Edit zsh config
```

## Links Uteis

- [Repositorio GitHub](https://github.com/Ruivalim/h)
- [Releases](https://github.com/Ruivalim/h/releases)
- [Issues](https://github.com/Ruivalim/h/issues)
