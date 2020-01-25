#!/usr/bin/env node
// tslint:disable no-var-requires
import path from 'path';
import childProcess from 'child_process';

interface IChildProcess {

}

const args: string[] = process.argv;
const libPath: string = path.resolve(__dirname, '../lib/index.js');
const shouldEnableTopLevelAwait: boolean = args.indexOf('--experimental-repl-await') !== -1;
if (shouldEnableTopLevelAwait) {
  (<childProcess.ChildProcess>require('child_process')).spawn(process.argv.shift(), [libPath], { //tslint:disable-line no-require-imports
    cwd: process.cwd(),
    env: {
      NODE_OPTIONS: '--experimental-repl-await',
      ...process.env
    },
    stdio: 'inherit',
    windowsHide: true
  });
} else {
  require(libPath);
}
