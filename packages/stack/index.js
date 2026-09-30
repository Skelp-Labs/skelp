import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export async function loadStack(filePath) {
  const absolutePath = path.resolve(filePath);
  const contents = await fs.readFile(absolutePath, 'utf8');
  const stack = JSON.parse(contents);
  if (!stack || !Array.isArray(stack.jobs)) throw new Error('Stack file must contain a "jobs" array.');
  const baseDirectory = path.dirname(absolutePath);
  const jobs = await Promise.all(stack.jobs.map((job, index) => normalizeJob(job, index, baseDirectory)));
  return { filePath: absolutePath, jobs };
}

export async function runStack(stack, options = {}) {
  const {
    parallel = false,
    keepGoing = false,
    dryRun = false,
    confirm = false,
    verbose = false,
    args: childArgs = {},
    confirmTask = defaultConfirm,
    executable = process.argv[1],
    spawnProcess = spawn,
    output = process.stdout,
    environment = process.env,
    maxDepth = 3
  } = options;
  const depth = Number(environment.SKELP_STACK_DEPTH || 0);
  if (depth >= maxDepth) throw new Error(`Maximum stack depth of ${maxDepth} reached.`);
  const stackId = environment.SKELP_STACK_ID || `${Date.now()}-${process.pid}`;
  const runJob = async (job) => {
    if (confirm && !(await confirmTask(job))) {
      output.write(`${job.name}: skipped\n`);
      return { ...job, status: 'skipped', code: 0 };
    }
    const command = buildCommand(executable, job, childArgs, verbose);
    if (dryRun) {
      output.write(`${job.name}: ${command.args.map(quoteArg).join(' ')}\n`);
      return { ...job, status: 'dry-run', code: 0 };
    }
    output.write(`${job.name}: starting\n`);
    return new Promise((resolve) => {
      const child = spawnProcess(command.file, command.args, {
        cwd: job.cwd,
        stdio: 'inherit',
        env: {
          ...environment,
          SKELP_STACK_DEPTH: String(depth + 1),
          SKELP_STACK_ID: stackId,
          SKELP_PARENT_PID: String(process.pid)
        }
      });
      child.on('error', (error) => resolve({ ...job, status: 'failed', code: 1, error }));
      child.on('exit', (code, signal) => resolve({
        ...job,
        status: code === 0 ? 'completed' : 'failed',
        code: code ?? 1,
        signal
      }));
    });
  };
  const results = [];
  if (parallel) results.push(...await Promise.all(stack.jobs.map(runJob)));
  else for (const job of stack.jobs) {
    const result = await runJob(job);
    results.push(result);
    if (result.status === 'failed' && !keepGoing) break;
  }
  for (const result of results) output.write(`${result.name}: ${result.status}\n`);
  return { results, code: results.some((result) => result.status === 'failed') ? 1 : 0 };
}

async function normalizeJob(job, index, baseDirectory) {
  if (!job || typeof job !== 'object') throw new Error(`Stack job ${index + 1} must be an object.`);
  if (!job.cwd) throw new Error(`Stack job ${index + 1} is missing "cwd".`);
  if (!job.prompt && !job.promptFile) throw new Error(`Stack job ${index + 1} needs "prompt" or "promptFile".`);
  const cwd = expandHome(job.cwd);
  const promptFile = job.promptFile ? path.resolve(baseDirectory, job.promptFile) : null;
  return {
    name: job.name || `job-${index + 1}`,
    cwd: path.resolve(cwd),
    prompt: job.prompt || await fs.readFile(promptFile, 'utf8')
  };
}

function buildCommand(executable, job, childArgs, verbose) {
  const args = [executable];
  args.push(...serializeArgs(childArgs));
  if (verbose && !args.includes('--verbose')) args.push('--verbose');
  args.push('--cwd', job.cwd, job.prompt);
  return { file: process.execPath, args };
}

function serializeArgs(options) {
  const stackOptions = new Set(['parallel', 'keepGoing', 'dryRun', 'confirm', 'verbose', 'args']);
  const result = [];
  for (const [key, value] of Object.entries(options)) {
    if (stackOptions.has(key) || value === undefined || value === false) continue;
    const flag = `--${key}`;
    if (value === true) result.push(flag);
    else result.push(flag, String(value));
  }
  return result;
}
function quoteArg(value) { return JSON.stringify(value); }
function expandHome(value) { return value.replace(/^~(?=\/|$)/, os.homedir()); }
function defaultConfirm(job) {
  return new Promise((resolve) => {
    process.stdout.write(`Run ${job.name}: ${job.prompt.trim()}? (Y/n) `);
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === '' || answer === 'y' || answer === 'yes');
    });
  });
}
