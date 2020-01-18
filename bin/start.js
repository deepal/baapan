#!/usr/bin/env node

const path = require('path');

const args = process.argv;
const libPath = path.resolve(__dirname, '../lib/index.js');
const shouldEnableTopLevelAwait = args.indexOf('--experimental-repl-await') !== -1;
if (shouldEnableTopLevelAwait) {
  if (process.argv) {
    require('child_process').spawn(process.argv.shift(), [libPath], {
      cwd: process.cwd(),
      env: {
        NODE_OPTIONS: '--experimental-repl-await',
        ...process.env,
      },
      stdio: 'inherit',
      windowsHide: true,
    });
  }
} else {
  require(libPath);
}
