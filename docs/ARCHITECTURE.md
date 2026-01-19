# Arquitetura do Projeto H CLI

## Visao Geral

O **h** e uma CLI (Command Line Interface) desenvolvida em TypeScript/Bun para auxiliar em workflows de desenvolvimento, oferecendo helpers para Kubernetes, Azure, Git, e automacao de releases.

## Estrutura de Diretorios

```
h/
├── src/
│   ├── index.ts              # Entry point - registra todos os comandos
│   ├── commands/             # Implementacao dos comandos
│   │   ├── kubectl.ts        # Helpers para Kubernetes (20+ subcomandos)
│   │   ├── azure.ts          # Gerenciador de subscriptions Azure
│   │   ├── misc.ts           # Comandos diversos (commit, ip, etc.)
│   │   ├── zsh.ts            # Gerenciador de configuracao Zsh
│   │   ├── release.ts        # Automacao de releases
│   │   └── config.ts         # Gerenciamento de configuracao da CLI
│   └── utils/                # Funcoes utilitarias
│       ├── exec.ts           # Execucao de comandos shell (usa Bun.spawn com arrays)
│       ├── prompt.ts         # Wrappers para prompts interativos
│       ├── ai.ts             # Integracao com IA (Claude/Ollama)
│       ├── config.ts         # Gerenciamento de configuracao
│       ├── icons.ts          # Icones e estilos de terminal
│       ├── update.ts         # Verificacao de atualizacoes
│       ├── commitlint.ts     # Carregamento de config commitlint
│       ├── release-notes.ts  # Geracao de release notes
│       └── kubectl.ts        # Helpers de kubectl
├── dist/                     # Binary compilado
├── docs/                     # Documentacao
├── .github/workflows/        # GitHub Actions
├── package.json              # Dependencias e scripts
├── tsconfig.json             # Configuracao TypeScript
├── .hrc                      # Configuracao de release hooks
└── CLAUDE.md                 # Instrucoes para Claude AI
```

## Fluxo de Execucao

```
                    ┌─────────────────────────────────────────┐
                    │           src/index.ts                  │
                    │  ┌─────────────────────────────────┐    │
                    │  │  checkForUpdates() [background] │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Register Commands:             │    │
                    │  │  • registerKubectlCommands()    │    │
                    │  │  • registerAzureCommands()      │    │
                    │  │  • registerMiscCommands()       │    │
                    │  │  • registerZshCommands()        │    │
                    │  │  • registerReleaseCommands()    │    │
                    │  │  • registerConfigCommands()     │    │
                    │  └─────────────────────────────────┘    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  program.parse()                │    │
                    │  └─────────────────────────────────┘    │
                    └─────────────────────────────────────────┘
```

## Padroes de Codigo

### 1. Command Registration Pattern

Cada modulo de comandos exporta uma funcao `registerXXXCommands(program)`:

```typescript
export function registerKubectlCommands(program: Command): void {
  const k = program.command("k").description("Kubectl helpers");

  k.command("gp")
    .description("Get pods")
    .argument("[name]", "Pod name filter")
    .action(async (name?: string) => {
      // Implementacao
    });
}
```

### 2. Safe Command Execution

Todos os comandos shell sao executados via `Bun.spawn` com array de argumentos (seguro):

```typescript
// SEGURO - array de argumentos (como o projeto usa)
const result = await Bun.spawn(["git", "diff", "--cached"]);
```

### 3. Interactive Prompts with Error Handling

```typescript
export async function select<T>(config: SelectConfig): Promise<T | null> {
  try {
    return (await inquirerSelect(config)) as T;
  } catch (err) {
    if (err instanceof ExitPromptError) {
      process.exit(0);  // Graceful exit on Ctrl+C
    }
    throw err;
  }
}
```

### 4. Configuration Pattern

Configuracao com merge de defaults para garantir backward compatibility:

```typescript
export function loadConfig(): HConfig {
  const config = JSON.parse(content);
  // Merge com defaults para garantir todos os campos existem
  return { ...DEFAULT_CONFIG, ...config };
}
```

## Dependencias

| Pacote | Uso |
|--------|-----|
| `commander` | Framework CLI |
| `@inquirer/prompts` | Prompts interativos |
| `chalk` | Cores e estilos no terminal |
| `figures` | Simbolos Unicode cross-platform |

## Ferramentas Externas Utilizadas

A CLI integra com diversas ferramentas externas:

- **Git** - Operacoes de versionamento
- **kubectl** - Gerenciamento Kubernetes
- **az** - Azure CLI
- **gh** - GitHub CLI (opcional)
- **claude** - Claude CLI para IA (configuravel)
- **nvim** - Editor padrao
- **bat** - Visualizacao com syntax highlighting
- **curl** - Requisicoes HTTP

## Build e Deploy

```bash
# Desenvolvimento
bun run dev

# Build do binary
bun run build  # Gera dist/h

# Release
bun run release  # ou h release
```

O binary e compilado via `bun build --compile` e distribuido via GitHub Releases.

## Configuracao

### CLI Config (`~/.h.config.json`)

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
    "checkOnStartup": true,
    "lastChecked": "2026-01-17T00:00:00.000Z"
  }
}
```

### Release Config (`.hrc`)

```json
{
  "release": {
    "versionFile": "package.json",
    "preRelease": ["bun run format", "bun run lint", "bun run build"],
    "postRelease": []
  }
}
```

## Seguranca

1. **Execucao de Comandos**: Usa `Bun.spawn` com arrays, nao strings
2. **Configuracao**: Arquivos em home directory com permissoes do usuario
3. **Secrets**: Nao armazena credenciais, usa ferramentas externas (az, kubectl)
4. **API Calls**: Usa HTTPS para GitHub API e Ollama local
