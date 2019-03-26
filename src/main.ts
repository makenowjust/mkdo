import arg from 'arg';
import fs from 'fs';
import cosmiconfig from 'cosmiconfig';

import {parse} from './parse';
import {executorMap, ExecContext} from './executor';
import {TaskMap} from './types';

type DefaultTask = (taskMap: TaskMap, ctx: ExecContext) => Promise<number>;

const help: DefaultTask = async () => {
  console.log(`mkdo - Markdown task runner

$ mkdo TASK_NAME [...ARGS]

Options:
    -f FILE,    --file           FILE     Markdown file path containing tasks
    -d DEPTH,   --root-depth     DEPTH    heading depth to determine task root
    -p PATTERN, --root-pattern   PATTERN  heading contents glob to determine task root
    -s SEP,     --task-separator SEP      seperator string for nested tasks
    -w DIR,     --cwd            DIR      working direcotory on task execution
    --help                                shows this help
    --version                             shows mkdo version

Default Tasks:

    help                                  shows this help
    tasks                                 shows tasks (but execludes default tasks)
    sync-scripts                          adds tasks to package.json's 'scripts' field

Examples:

    Run task 'build' defined in 'mkdo.md':

        $ mkdo build

    Run task 'format:check' defined in section '## tasks' of 'readme.md':

        $ mkdo -f readme.md -d 2 -p tasks format:check
`);

  return 0;
};

const tasks: DefaultTask = async taskMap => {
  const tasks = Array.from(taskMap.values()).sort((a, b) =>
    a.name === b.name ? 0 : a.name > b.name ? 1 : -1,
  );

  let maxLength = 0;
  for (const task of tasks) {
    maxLength = Math.max(task.name.length, maxLength);
  }

  console.log('Tasks:');
  console.log();
  for (const task of tasks) {
    console.log(`    ${task.name.padEnd(maxLength)}  ${task.description || ''}`);
  }

  return 0;
};

const syncScripts: DefaultTask = async (taskMap, ctx) => {
  const args = arg(
    {
      '--package-json-file': String,
      '--mkdo': String,
      '--check': Boolean,
    },
    {argv: ctx.args.concat()},
  );
  const mkdo = args['--mkdo'] || 'mkdo';
  const check = args['--check'] || false;
  const packageJSONPath = args['--package-json-file'] || 'package.json';

  const tasks = Array.from(taskMap.values()).sort((a, b) =>
    a.name === b.name ? 0 : a.name > b.name ? 1 : -1,
  );

  const pkg = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
  let needsWrite = false;
  if (!pkg.scripts) {
    pkg.scripts = {};
    needsWrite = true;
  }
  if (pkg.scripts.mkdo !== mkdo) {
    pkg.scripts.mkdo = mkdo;
    needsWrite = true;
  }
  for (const task of tasks) {
    // TODO: escape task name correctly
    const cmd = `${mkdo} ${task.name}`;
    if (pkg.scripts[task.name] !== cmd) {
      pkg.scripts[task.name] = cmd;
      needsWrite = true;
    }
  }
  if (!check && needsWrite) {
    ctx.log('updates package.json');
    fs.writeFileSync(packageJSONPath, JSON.stringify(pkg, null, '  '));
  }

  if (check && needsWrite) {
    ctx.error('needs to update package.json');
    return 1;
  }

  return 0;
};

const defaultTaskMap: Map<string, DefaultTask> = new Map([
  ['help', help],
  ['tasks', tasks],
  ['sync-scripts', syncScripts],
]);

const explorer = cosmiconfig('mkdo');

export const mkdo = async (argv = process.argv.slice(2)) => {
  const args = arg(
    {
      '--help': Boolean,
      '--file': String,
      '--root-depth': Number,
      '--root-pattern': String,
      '--task-separator': String,
      '--cwd': String,
      '-f': '--file',
      '-d': '--root-depth',
      '-p': '--root-pattern',
      '-s': '--task-separator',
      '-w': '--cwd',
    },
    {
      stopAtPositional: true,
      argv,
    },
  );

  if (args['--help']) {
    await help(null as any, null as any);
    return;
  }

  const cwd = args['--cwd'] || process.cwd();

  const r = await explorer.search(cwd);
  const config = (r && r.config) || {};

  const [taskName, ...taskArgs] = args._;
  const filePath = args['--file'] || config['file'] || 'mkdo.md';
  const rootDepth = args['--root-depth'] || config['rootDepth'] || 1;
  const rootPattern = args['--root-pattern'] || config['rootPattern'] || '*';
  const taskSeparator = args['--task-separator'] || config['taskSeparator'] || ':';

  const parseOptions = {
    rootDepth,
    rootPattern,
    taskSeparator,
  };

  const ctx = {
    log: msg => console.log(`[mkdo] ${msg}`),
    error: msg => console.error(`[mkdo] ${msg}`),
    cwd,
    args: taskArgs,
  };

  if (!taskName) {
    ctx.error('no task');
    await help(null as any, null as any);
    process.exit(1);
    return;
  }

  const taskMap = await parse(filePath, parseOptions);
  const task = taskMap.get(taskName);
  if (!task) {
    const defaultTask = defaultTaskMap.get(taskName);
    if (defaultTask) {
      const exitCode = await defaultTask(taskMap, ctx);
      process.exit(exitCode);
      return;
    }

    ctx.error(`unknown task '${taskName}'`);
    process.exit(1);
    return;
  }

  let exitCode = 0;
  for (const code of task.codes) {
    const executor = executorMap.get(code.language);
    if (!executor) {
      continue;
    }

    exitCode = await executor(code, ctx);
    if (exitCode !== 0) {
      break;
    }
  }

  process.exit(exitCode);
};
