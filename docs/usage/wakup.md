To avoid injecting complicated and unnecessary context we use a `wakeup` file.

This is a markdown file you can tune to customize the wake-up behavior of Skelp.

You can craft various wakeup files for different purposes or just leave it out.

# Triggering the Wakeup File Manually
```sh
skelp "Wakeup ~/.skelp/knowledge/wakeup.md"
```

# To specify the Wakeup File

You can specify a custom wakeup file by providing its path as an argument to Skelp:
```sh
skelp config set wakeup ~/.skelp/knowledge/wakeup.md

# Custom Wakeup File
skelp config set wakeup /path/to/your/custom/wakeup.md

# Turn it off
skelp config set wakeup ""
```

# Fast wakeup

You can speed up the wake up by converting it to code
```sh
skelp "Convert wakeup.md to python put it at wakeup.py" --cwd ~/.skelp/knowledge

skelp "Convert ~/.skelp/knowledge/wakeup.md to python put it at ~/.skelp/knowledge/wakeup.py"
skelp "Convert ~/.skelp/knowledge/wakeup.md to nodejs code"
```