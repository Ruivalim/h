# Problemas Identificados e Melhorias Sugeridas

Este documento lista os problemas encontrados no codigo e sugestoes de melhoria.

---

## Problemas Criticos

### 1. Variable Shadowing em misc.ts:90

**Arquivo:** `src/commands/misc.ts:90`

**Problema:** A variavel `info` faz shadowing da funcao `info` importada de icons.ts.

```typescript
// Linha 3: import { info, success, error, warn } from "../utils/icons";
// Linha 90: const info = JSON.parse(infoRaw);  // SHADOWING!
```

**Impacto:** Pode causar comportamento inesperado se `info()` for chamada apos a linha 90.

**Solucao:** Renomear a variavel para `ipInfo` ou `locationInfo`.

---

### 2. Exit Code Nao Verificado em utils/exec.ts

**Arquivo:** `src/utils/exec.ts:1-8`

**Problema:** A funcao nao verifica o exit code do comando executado.

**Impacto:** Comandos que falham retornam string vazia em vez de lancar erro.

**Solucao:** Verificar `result.exitCode` e lancar erro se diferente de 0.

---

### 3. Try/Catch Vazio em release.ts

**Arquivo:** `src/commands/release.ts:187-191`

**Problema:** Catch vazio sem tratamento adequado.

**Impacto:** Oculta erros que nao sao relacionados a "no tags found".

**Solucao:** Verificar a mensagem de erro especifica ou usar uma abordagem diferente.

---

### 4. Uso de Shell em kubectl.ts

**Arquivo:** `src/commands/kubectl.ts:157-163`

**Problema:** Usa `sh -c` para piping entre comandos.

**Impacto:** Potencial problema de seguranca se os argumentos nao forem sanitizados.

**Solucao:** Usar `Bun.spawn` com pipe direto entre processos.

---

## Problemas Medios

### 5. Clipboard Copy So Funciona no macOS

**Arquivo:** `src/commands/misc.ts:525-534`

**Problema:** Funcionalidade de clipboard so implementada para macOS.

**Solucao:** Adicionar suporte para Linux (xclip/xsel) e Windows (clip).

---

### 6. Duplicacao de Codigo em zsh.ts

**Arquivo:** `src/commands/zsh.ts`

**Problema:** Os comandos `open` e `edit` tem codigo quase identico.

**Solucao:** Extrair logica comum para uma funcao helper.

---

### 7. Config Directory Nao Usado

**Arquivo:** `src/utils/config.ts:53-58`

**Problema:** Cria diretorio `.config` mas salva na home.

**Solucao:** Mover config para `~/.config/h/config.json` para seguir XDG Base Directory Specification.

---

### 8. Timeout Faltando para Ollama API

**Arquivo:** `src/utils/ai.ts:20-30`

**Problema:** Requisicao para Ollama nao tem timeout configurado.

**Solucao:** Adicionar AbortController com timeout.

---

### 9. Autocomplete Desatualizado

**Arquivo:** `src/commands/zsh.ts:193-250`

**Problema:** O script de autocomplete nao lista todos os comandos `k` atuais.

**Solucao:** Atualizar lista de subcomandos para incluir todos os 20+ comandos existentes.

---

## Melhorias Sugeridas

### Qualidade de Codigo

| # | Melhoria | Prioridade |
|---|----------|------------|
| 1 | Adicionar testes unitarios com `bun test` | Alta |
| 2 | Dividir `misc.ts` (720 linhas) em arquivos menores | Media |
| 3 | Adicionar logging estruturado | Media |
| 4 | Adicionar validacao de input do usuario | Media |
| 5 | Adicionar JSDoc comments nas funcoes publicas | Baixa |

### Novas Funcionalidades

| # | Feature | Prioridade |
|---|---------|------------|
| 1 | Suporte a AWS CLI (aws) | Media |
| 2 | Suporte a Google Cloud CLI (gcloud) | Media |
| 3 | Progress bars para operacoes longas | Media |
| 4 | Historico de comandos | Baixa |
| 5 | Plugins/extensibilidade | Baixa |

### UX

| # | Melhoria | Prioridade |
|---|----------|------------|
| 1 | Clipboard copy para Linux/Windows | Alta |
| 2 | Editor configuravel (alem de nvim) | Media |
| 3 | Cores/temas configuraveis | Baixa |
| 4 | Internacionalizacao (i18n) | Baixa |

### Arquitetura

| # | Melhoria | Prioridade |
|---|----------|------------|
| 1 | Mover config para XDG-compliant path | Media |
| 2 | Cache de resultados de comandos kubectl | Media |
| 3 | Retry logic para chamadas de API | Media |
| 4 | Mais providers de IA (OpenAI, Gemini) | Baixa |

---

## Metricas de Codigo

| Metrica | Valor | Alvo |
|---------|-------|------|
| Linhas de codigo | ~2500 | - |
| Cobertura de testes | 0% | 70%+ |
| Arquivos > 500 linhas | 2 (misc.ts, release.ts) | 0 |
| Duplicacao de codigo | Presente em zsh.ts | Nenhuma |
| Type safety | Boa | Excelente |
