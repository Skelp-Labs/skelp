# Skelp stacks

Run several independent one-shot Skelp sessions from one stack file:

```bash
skelp stack run skelp-stack.json
```

Example `skelp-stack.json`:

```json
{
  "jobs": [
    {
      "name": "snake",
      "cwd": "~/.skelp/workspace/snake",
      "promptFile": "prompts/snake.md"
    },
    {
      "name": "pong",
      "cwd": "~/.skelp/workspace/pong",
      "prompt": "Build and test this game."
    }
  ]
}
```

Or with a shared `cwd` for all jobs:
```json
{
  "cwd": "~/.skelp/workspace/shared",
  "jobs": [
    {
      
      "promptFile": "prompts/snake.md"
    },
    {
      "prompt": "Build and test this game."
    }
  ]
}
```

Jobs run sequentially by default and stop after the first failure. Use these options when needed:

```bash
skelp stack run skelp-stack.json --keep-going
skelp stack run skelp-stack.json --parallel
skelp stack run skelp-stack.json --dry-run
```

`cwd` is resolved from the user's home directory when it starts with `~`. Relative `promptFile` paths are resolved relative to the stack file. Each child receives stack metadata through environment variables and is limited to three nested stack levels.
