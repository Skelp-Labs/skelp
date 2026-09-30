# @skelp/agentloop

Een kleine, frameworkloze agent loop voor OpenAI-compatible streaming APIs. De package werkt in Node.js en moderne browsers en ondersteunt:

- streaming tekst en reasoning;
- meerdere tool calls per stap;
- server-side tools en client-side tools via `onClientTool`;
- correcte assistant `tool_calls` en `tool` history;
- een begrensd aantal loopstappen.
- een `onStep` guardrail vóór iedere modelaanvraag.

## Installatie

Binnen deze workspace:

```sh
pnpm add @skelp/agentloop
```

Of importeer lokaal vanuit `src/index.js` tijdens ontwikkeling.

## Node.js

```js
import { createAgentLoop, createOpenAIClient } from '@skelp/agentloop';

const agent = createAgentLoop({
  client: createOpenAIClient({
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model'
  }),
  tools: [{
    type: 'function',
    function: {
      name: 'lookup',
      description: 'Look up a value.',
      parameters: { type: 'object', properties: { key: { type: 'string' } } }
    },
    handler: async ({ key }) => `value for ${key}`
  }]
});

await agent.run('Look up status', {
  onText: (text) => process.stdout.write(text),
  onToolResult: ({ name, result }) => console.error(name, result)
});
```

Een guardrail kan vóór een stap stoppen. Geef `false` terug vanuit `onStep`; de loop doet dan geen nieuwe modelaanvraag en roept `onStop` aan.

```js
await agent.run('Do something', {
  onStep: ({ step, remaining }) => {
    console.log(`step ${step}, ${remaining} remaining`);
    return step < 3;
  },
  onStop: console.log
});
```

Run het complete voorbeeld met:

```sh
pnpm --filter @skelp/agentloop example:node "What time is it?"
```

## Browser

Open `examples/browser.html` through a static server. Het voorbeeld importeert dezelfde packagecode als ES module en gebruikt dezelfde `createAgentLoop` API. Voor een lokale modelserver moet CORS zijn ingeschakeld.

## Client-side tools

Wanneer een tool geen `handler` heeft, kan de caller hem uitvoeren:

```js
await agent.run('Open the dashboard', {
  onToolResult: console.log
}, {
  onClientTool: async ({ name, args }) => {
    return executeInTheBrowser(name, args);
  }
});
```

Zie [examples/node.js](examples/node.js) en [examples/browser.html](examples/browser.html) voor runnable voorbeelden.