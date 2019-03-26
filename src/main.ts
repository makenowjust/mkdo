import arg from 'arg';
import fs from 'fs';
import cosmiconfig from 'cosmiconfig';
import readPkg from 'read-pkg-up';

import {parse} from './parse';
import {executorMap, ExecContext} from './executor';
import {TaskMap} from './types';

type DefaultTask = (taskMap: TaskMap, ctx: ExecContext) => Promise<number>;

const help = async () => {
  console.log(`mkdo - Markdown task runner

$ mkdo TASK_NAME [...ARGS]

Options:
    -f FILE,    --file           FILE     Markdown file path containing tasks
    -d DEPTH,   --root-depth     DEPTH    root heading depth
    -p PATTERN, --root-pattern   PATTERN  root heading contents glob
    -s SEP,     --task-separator SEP      seperator string for nested tasks
    -w DIR,     --cwd            DIR      working direcotory on task execution
    --help                                show this help
    --version                             show mkdo version

Default Tasks:

    help                                  show this help
    version                               show mkdo version
    tasks                                 show task names
    sync-scripts                          adds tasks to package.json's 'scripts'

Examples:

    Run task 'build' defined in 'mkdo.md':

        $ mkdo build

    Run task 'format:check' defined in section '## tasks' of 'readme.md':

        $ mkdo -f readme.md -d 2 -p tasks format:check
`);

  return 0;
};

const version = async () => {
  const {pkg} = await readPkg({cwd: __dirname});
  console.log(pkg.version);
  return 0;
};

const tasks = async (taskMap: TaskMap) => {
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

const syncScripts = async (taskMap: TaskMap, ctx: ExecContext) => {
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

const defaultTaskMap = new Map<string, DefaultTask>([
  ['help', help],
  ['version', version],
  ['tasks', tasks],
  ['sync-scripts', syncScripts],
]);

const explorer = cosmiconfig('mkdo');

/**
 * Executes `mkdo` command.
 *
 * @param argv command line arguments
 * @returns the exit code
 */
export const mkdo = async (argv = process.argv.slice(2)): Promise<number> => {
  const args = arg(
    {
      '--help': Boolean,
      '--version': Boolean,
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
    return await help();
  }

  if (args['--version']) {
    return await version();
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
    await help();
    return 1;
  }

  const taskMap = await parse(filePath, parseOptions);
  const task = taskMap.get(taskName);
  if (!task) {
    const defaultTask = defaultTaskMap.get(taskName);
    if (defaultTask) {
      return await defaultTask(taskMap, ctx);
    }

    ctx.error(`unknown task '${taskName}'`);
    return 1;
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

  return exitCode;
};
