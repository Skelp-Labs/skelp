import readline from 'node:readline';
import process from 'node:process';
import { detectProvider, fetchModels } from '../detect-provider.js';

export function promptForServer() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log('\n\x1b[33m⚠ No local LLM provider detected.\x1b[0m');
    rl.question('Enter server URL (or press Enter for http://localhost:1234): ', async (answer) => {
      const url = answer.trim() || 'http://localhost:1234';
      const models = await fetchModels(url);
      const model = models.length > 0 ? models[0] : 'local-ai-model';
      if (models.length > 0) {
        console.log(`\x1b[2m  Using model: ${model}\x1b[0m`);
      } else {
        console.log('\x1b[33m⚠ No models found. Using default model name "local-ai-model".\x1b[0m');
        console.log('\x1b[2m  You can change it later with: /config set primaryModel <name>\x1b[0m');
      }
      rl.close();
      resolve({ url, model });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  promptForServer();
}