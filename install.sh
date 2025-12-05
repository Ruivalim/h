#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_NAME="h"
INSTALL_DIR="${HOME}/.local/bin"
ZSHRC_PATHS="${HOME}/.zshrc_paths"
EXPORT_LINE='export PATH="$HOME/.local/bin:$PATH"'

mkdir -p "$INSTALL_DIR"

bun build "$SCRIPT_DIR/src/index.ts" --compile --outfile "$INSTALL_DIR/$BIN_NAME"

chmod +x "$INSTALL_DIR/$BIN_NAME"

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  touch "$ZSHRC_PATHS"
  if ! grep -qF '.local/bin' "$ZSHRC_PATHS"; then
    echo "$EXPORT_LINE" >> "$ZSHRC_PATHS"
    echo "Added PATH to $ZSHRC_PATHS"
  fi
fi

echo "Installed: $INSTALL_DIR/$BIN_NAME"
echo "Run: h --help"
