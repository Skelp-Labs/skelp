# Skelp

Skelp is a minimal, blazing-fast developer shell powered by a locally running or remote OpenAI-compatible AI model.

## Features
- **Local Assistant Integration**: Smooth compatibility with toolsets like Ollama, Llama.cpp, or any OpenAI-compatible API connection.
- **Natural Language Commands**: Execute complex shell tasks using regular spoken language.
- **Agentic Capabilities**: Automatically runs shell commands, reads, and writes files intelligently to satisfy user goals.
- **Streaming Responses**: Delivers instant feedback word-by-word.
- **Minimalistic UI**: Clean terminal control board with responsive statuses.
- **Tone Customization**: Personalize the tone of the assistant (e.g. `concise, friendly and helpful`).
- **System Instructions**: Add persistent user instructions that guide every assistant request.
- **Session History Logging**: Past interactions are stored beautifully inside timestamped files.

## Installation

Install dependencies and link the CLI locally:

```sh
npm install
npm link
```

```sh 
npm i -g https://github.com/skelp-labs/skelp
```

## Usage

### Interactive Shell
Launch the interactive shell simply by running:
```sh
skelp
```

### Slash Commands (Inside Shell)
You can type convenient slash commands directly into the prompt:
- `/help` — Display list of commands.

### Keyboard Shortcuts
- **`Ctrl+N`**: Instantly starts a fresh session, clears conversation context history, and generates a new log file.
- **`Ctrl+C`**: Exit the shell.

### One-Off Tasks
Run tasks directly from your default shell:
```sh
mkdir -p ~/.skelp/workspace/newproject && cd ~/.skelp/workspace/newproject
skelp "Write a summary of the latest AI research papers to papers.md"
skelp "Change the server to http://localhost:5678"
skelp "Which models are available?"
skelp "Create a simple electron app and start it"
skelp "Download https://samplelib.com/csv/sample-10mb.csv"
```

### Configuration Commands
Manage settings directly from your terminal:
```sh
skelp config list
skelp config get tone
skelp config set server http://localhost:5678
skelp config set tone "formal and professional"
skelp config set soul thorough
skelp config set soul /absolute/path/to/my-soul.md
skelp config set userSystem "Always explain risky changes before applying them."
skelp config set autoApprove true
skelp config reset
```

## Configuration

Settings are preserved globally in `~/.skelprc`:
```json
{
  "server": "auto",
  "primaryModel": "local-ai-model",
  "tone": "concise, friendly and helpful",
  "soul": "standard",
  "userSystem": "",
  "autoApprove": false
}
```

### Auto-Detection

By default, `server` is set to `"auto"`. On launch, Skelp probes known local LLM providers in order:

1. **LM Studio** — `http://localhost:1234`
2. **Ollama** — `http://localhost:11434`

The first provider that responds is saved to your config along with the first available model. If none are found, you'll be prompted to enter a server URL manually.

To re-trigger auto-detection, set the server back to `"auto"`:
```sh
skelp config set server auto
```
