#!/usr/bin/env node

import {mkdo} from '../src';

mkdo().catch(err => console.error(err));
