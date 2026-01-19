# h CLI

CLI helper tools for development workflows - Kubernetes, Azure, Git, and release automation.

## Features

- **Kubernetes Helpers**: 20+ interactive kubectl commands
- **Azure Integration**: Subscription switcher with search
- **AI-Powered Commits**: Generate commit messages using Claude or Ollama
- **Release Automation**: Version bumping, changelog generation, GitHub releases
- **Zsh Config Manager**: Manage your shell configuration

## Installation

### Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/Ruivalim/h/main/install.sh | bash
```

### Manual Install

Download the binary from [Releases](https://github.com/Ruivalim/h/releases):

```bash
# macOS (arm64)
curl -fsSL https://github.com/Ruivalim/h/releases/latest/download/h-darwin-arm64 -o ~/.local/bin/h
chmod +x ~/.local/bin/h

# Linux (x64)
curl -fsSL https://github.com/Ruivalim/h/releases/latest/download/h-linux-x64 -o ~/.local/bin/h
chmod +x ~/.local/bin/h
```

## Quick Start

```bash
# See all commands
h --help

# Configure AI provider
h config set-ai

# Kubernetes: get pods
h k gp

# Azure: switch subscription
h azs

# Git: AI-powered commit
h commit

# Release new version
h release
```

## Commands Overview

### Kubernetes (`h k`)

```bash
h k gp [name]       # Get pods
h k dlp             # Delete pod (interactive)
h k exp             # Exec into pod
h k lp              # Logs from pod (follow)
h k gs              # Get secret (decoded)
h k gcm             # Get configmap
h k gns             # Switch namespace
h k top             # Top pods by CPU
h k debug           # Create debug pod
```

### Azure (`h azs`)

```bash
h azs               # Interactive subscription switch
h azs "My Sub"      # Switch by name
```

### Git + AI

```bash
h commit            # Generate commit message with AI
h commit --debug    # Show AI prompt
h branch-diff       # Generate diff report between branches
```

### Release (`h release`)

Automated release workflow:
1. Version bump (major/minor/patch)
2. Pre-release hooks (format, lint, build)
3. AI-generated commit message
4. Git tag and push
5. AI-generated release notes
6. CHANGELOG.md update
7. GitHub Release creation

### Zsh (`h z`)

```bash
h z list            # List config files
h z edit            # Edit config file
h z exports         # Move exports between files
h z autocomplete    # Setup shell completions
```

### Config (`h config`)

```bash
h config show       # Show current config
h config set-ai     # Configure AI provider
h config edit       # Edit config file
h config reset      # Reset to defaults
```

### Utilities

```bash
h ip                # Show public IP and location
h oxker             # Docker TUI
h upgrade           # Update h CLI
h uninstall         # Remove h CLI
```

## Configuration

### AI Provider (`~/.h.config.json`)

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

### Release Hooks (`.hrc`)

```json
{
  "release": {
    "versionFile": "package.json",
    "preRelease": ["bun run format", "bun run lint", "bun run build"],
    "postRelease": []
  }
}
```

## Documentation

See the [docs/](./docs/) folder for detailed documentation:

- [Installation Guide](./docs/INSTALLATION.md)
- [Commands Reference](./docs/COMMANDS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun run dev

# Build binary
bun run build

# Lint & format
bun run lint
bun run format

# Release new version
bun run release
```

## Requirements

- macOS (arm64) or Linux (x64)
- Git
- Optional: kubectl, az, claude, gh, nvim, bat, docker

## Built with

- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal styling

## License

MIT
