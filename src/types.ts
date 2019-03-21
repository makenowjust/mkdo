/**
 * `TaskMap` is `Map` from task names to tasks.
 *
 * This values tasks ensure `codes` are not empty.
 */
export type TaskMap = Map<string, Task>;

/**
 * `Task` is mkdo task.
 */
export interface Task {
  /**
   * A task name.
   */
  name: string;

  /**
   * A task description.
   *
   * It sets as text of the first node under this task.
   * When it is missing, it sets `null`.
   */
  description: string | null;

  /**
   * Code blocks under this task.
   */
  codes: Code[];
}

/**
 * `Code` is code block in task.
 */
export interface Code {
  /**
   * A code language. (e.g. `javascript`, `bash` or `console`)
   */
  language: string;

  /**
   * A code block text.
   */
  value: string;
}
