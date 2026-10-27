#!/usr/bin/env bash

set -euo pipefail

OS="$(uname -s)"
if [[ "$OS" != "Linux" && "$OS" != "Darwin" ]]; then
  echo "This installer supports Linux and macOS." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to install nvm." >&2
  exit 1
fi

if [[ -z "${NVM_DIR:-}" ]]; then
  if [[ -n "${XDG_CONFIG_HOME:-}" ]]; then
    NVM_DIR="$XDG_CONFIG_HOME/nvm"
  else
    NVM_DIR="$HOME/.nvm"
  fi
fi
export NVM_DIR

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
fi

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm installation did not create $NVM_DIR/nvm.sh." >&2
  exit 1
fi

# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

echo "Installing Node.js 24..."
nvm install 24
nvm alias default 24

echo "Installing Skelp..."
npm install --global https://github.com/skelp-labs/skelp

echo "Skelp is installed. Run 'skelp' to get started."