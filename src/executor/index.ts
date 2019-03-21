import {bash} from './bash';
import {console} from './console';

export const executorMap = new Map([['bash', bash], ['console', console]]);
export * from './types';
