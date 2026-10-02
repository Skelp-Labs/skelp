# Usage

To use Skelp, you can run the following commands:

```bash
skelp
```

# Configuration
Configuration can be set with the following commands:

```bash
# Current configuration
skelp config

# Get a configuration value
skelp config get <key>
skelp config get primaryModel

# Set a new configuration value
skelp config set <key> <value>
skelp config set interface tui
skelp config set interface plain
```

## Rendering
You can configure how Skelp renders its output using the following commands:
```sh
skelp config set interface plain
skelp config set interface raw
skelp config set interface progress
skelp config set interface markdown
```
    
# One-Off Tasks
Run tasks directly from your default shell:
```sh
skelp "How does cat command work?"
mkdir -p ~/.skelp/workspace/newproject && cd ~/.skelp/workspace/newproject
skelp "Write a summary of the latest AI research papers to papers.md"
skelp "Change the server to http://localhost:5678"
skelp "Which models are available?"
skelp "Create a simple electron app and start it"
skelp "Download https://samplelib.com/csv/sample-10mb.csv"
skelp "Download https://samplelib.com/csv/sample-10mb.csv use wget"
skelp "Test a sleep command"
skelp "Stop process at port 3000"

# From file
skelp $(cat examples/specs/snake.md) --cwd ~/.skelp/workspace/snake
skelp --file examples/specs/snake.md --cwd ~/.skelp/workspace/snake

skelp stack "Task 1" "Task 2" "Task 3"

# Bevestig elke taak voordat die start
skelp stack "Task 1" "Task 2" "Task 3" --confirm
```
