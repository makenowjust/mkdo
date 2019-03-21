import execa from 'execa';

import {Executor} from './types';

export const console: Executor = async (code, ctx) => {
  // Concats line continuation and splits into lines.
  const lines = code.value.replace('\\\n', '').split('\n');

  // Executes each lines.
  for (const line of lines) {
    if (!line.startsWith('$ ')) {
      break;
    }

    const shellLine = line.slice(2);

    ctx.log(`$ ${shellLine}`);
    const exitCode = await execa(shellLine, ctx.args, {
      shell: true,
      stdio: 'inherit',
      cwd: ctx.cwd,
    }).then(r => r.code, e => e.code);
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  return 0;
};
