import execa from 'execa';

import {Executor} from './types';

export const bash: Executor = async (code, ctx) => {
  ctx.log('run bash script');
  return execa('bash', ['-c', code.value, '--', ...ctx.args], {
    stdio: 'inherit',
    cwd: ctx.cwd,
  }).then(r => r.code, e => e.code);
};
