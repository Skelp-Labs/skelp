# Example
```json
{
  "id": "1789987510627-q36ng3",
  "title": "Title",
  "messages": [
    {
      "role": "user",
      "parts": [
        {
          "id": "text",
          "type": "text",
          "content": "Hello"
        }
      ]
    },
    {
      "role": "assistant",
      "parts": [
        {
          "id": "text-1",
          "type": "text",
          "content": "Hi"
        }
      ],
      "startedAt": 1789987519247,
      "completedAt": 1789987526685
    }
  ],
  "settings": {},
  "createdAt": 1789987510627,
  "updatedAt": 1789987526685
}
```

# Parts

```js
// Text
{
  "id": "text-3",
  "type": "text",
  "content": "thought\n"
}

// Tool
{
  "id": "tool-2",
  "type": "tool",
  "key": "0:0",
  "index": 0,
  "toolId": "call_4nt59aw3",
  "name": "execute_command",
  "argsStr": "{\"command\":\"mkdir -p skelp/plugins/callouts/docs skelp/plugins/callouts/test\"}",
  "status": "done",
  "result": "[No output]"
}
```