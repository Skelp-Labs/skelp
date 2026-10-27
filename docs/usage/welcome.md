Welcome to Skelp!

To get started run the following command:
```sh
skelp setup

# Start with the welcome template (forces interactive mode with a initial prompt)
skelp chat -f ./knowledge/welcome.md

# Test streaming terminal output
skelp 'Use execute_command and run exactly: for i in 1 2 3; do echo "tick $i"; sleep 1; done'
```
