# Terminal Skill

Use `execute_command` for short, non-interactive shell commands. Ask for confirmation unless automatic approval is enabled.

Use the `background` argument to run commands asynchronously without blocking the main process.

For example don't `npx serve &` directly; use the `background` argument instead.