import unified from 'unified';
import markdown from 'remark-parse';
import toString from 'mdast-util-to-string';
import pm from 'picomatch';
import toVfile from 'to-vfile';

import {TaskMap, Task} from './types';

/**
 * `ParseOption` is options for `parse` function.
 */
export interface ParseOptions {
  /**
   * A depth to determine root.
   */
  rootDepth: number;

  /**
   * A glob pattern to determine root.
   */
  rootPattern: string;

  /**
   * A task seperator for nested tasks.
   */
  taskSeparator: string;
}

/**
 * The default parse options.
 */
const DEFAULT_OPTIONS: ParseOptions = {
  rootDepth: 1,
  rootPattern: '*',
  taskSeparator: ':',
};

/**
 * `unified` instance to parse Markdown.
 */
const compiler = unified().use(markdown);

/**
 * Parses Markdown file `filePath` and extracts mkdo tasks from it.
 *
 * @param filePath a Markdow file path
 * @param opts     a parse options
 * @returns a `Map` from task names to tasks.
 */
export const parse = async (
  filePath: string,
  opts: Partial<ParseOptions> = {},
): Promise<TaskMap> => {
  // Destructs `opts`.
  const {rootDepth, rootPattern, taskSeparator} = Object.assign({}, DEFAULT_OPTIONS, opts);
  const isMatchRootPattern = pm(rootPattern);

  // Parses markdown file:
  const file = await toVfile.read(filePath);
  const tree: any = compiler.parse(file);

  // Extracts tasks from the Markdown tree.
  const tasks: Task[] = [];
  let task: Task | null = null;
  const nameStack: string[] = [];
  let isUnderRoot = rootDepth <= 0;

  // Iterates each children nodes of the tree.
  for (const node of tree.children) {
    // On heading node (e.g. `## foo`):
    if (node.type === 'heading') {
      // Finalizes current processing `task` when the child node is heading.
      if (task !== null) {
        tasks.push(task);
        task = null;
      }

      // Updates the name stack following this heading node.
      while (nameStack.length >= node.depth) {
        nameStack.pop();
      }
      while (nameStack.length < node.depth - 1) {
        nameStack.push('');
      }
      const name = toString(node);
      nameStack.push(name);

      // Checks whether this is root or not when heading depth means root.
      if (nameStack.length === rootDepth) {
        isUnderRoot = isMatchRootPattern(name);
      }

      // Initializes `task` by the heading under root.
      if (isUnderRoot && nameStack.length > rootDepth) {
        task = {
          name: nameStack.slice(rootDepth).join(taskSeparator),
          description: null,
          codes: [],
        };
      }

      continue;
    }

    // On processing `task`:
    if (task) {
      // Registers `code` to `task`.
      if (node.type === 'code') {
        task.codes.push({
          language: node.lang,
          value: node.value,
        });

        // Or sets task description as the first node content.
      } else if (task.description === null) {
        task.description = toString(node);
      }
    }
  }

  // Finalizes the last task if remaining.
  if (task) {
    tasks.push(task);
  }

  // Converts `tasks` to `taskMap`.
  const taskMap: TaskMap = new Map();
  for (const task of tasks) {
    if (task.codes.length === 0) {
      continue;
    }

    if (taskMap.has(task.name)) {
      throw new Error(`duplicated task '${task.name}' is defined`);
    }

    taskMap.set(task.name, task);
  }

  return taskMap;
};
