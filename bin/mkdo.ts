#!/usr/bin/env node

import {mkdo} from '../src';

const main = async () => {
  try {
    const exitCode = await mkdo();
    process.exit(exitCode);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
