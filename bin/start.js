#!/usr/bin/env node

const path = require('path');

const libPath = path.resolve(__dirname, '../lib/index.js');

require('child_process').spawn(process.argv.shift(), [libPath], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-repl-await',
  },
  windowsHide: true,
  stdio: 'inherit',
});
