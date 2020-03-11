#!/usr/bin/env node

import path from 'path';

const nodePath = process.argv[0];
const nodeEnvOpts = (process.env.NODE_OPTIONS || '').split(' ');
const nodeArgs = process.argv.slice(2);
const libPath = path.resolve(__dirname, 'index.js');

const mergedNodeOpts = (
  [...nodeEnvOpts, ...nodeArgs]
    .map((opt) => opt.trim())
    .filter((opt) => !!opt)
);

require('child_process').spawn(nodePath, [libPath], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: mergedNodeOpts.join(' '),
  },
  stdio: 'inherit',
  windowsHide: true,
});
