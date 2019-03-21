import {Code} from '../types';

/**
 * `ExecContext` is context passed to `Executor`'s second argument.
 */
export interface ExecContext {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: string;
  args: ReadonlyArray<string>;
}

/**
 * `Executor` is function type to execute the given `code`.
 */
export type Executor = (code: Code, ctx: ExecContext) => Promise<number>;
