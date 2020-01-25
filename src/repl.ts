#!/usr/bin/env node
import 'colors';
import os from 'os';
import path from 'path';
import repl from 'repl';
import {
  baapan,
  cleanUpWorkspace,
  setupReplHistory,
  switchToWorkspace,
  wrapRequire
} from './baapan';

let workspacePath: (string | undefined) = process.env.BAAPAN_WS_PATH;
let shouldCleanup: boolean = false;
const HOME_DIR: string = os.homedir();

if (process.env.BAAPAN_WS_PATH !== undefined && process.env.BAAPAN_WS_PATH.length > 0) {
  const WORKSPACE_DIR: string = `.baapan/workspace_${process.pid}_${Date.now()}`;
  workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);
  process.env.BAAPAN_WS_PATH = workspacePath;
  shouldCleanup = true;
}

/**
 * Start baapan REPL
 */
function startRepl(): void {
  switchToWorkspace(workspacePath, { cleanUp: true });
  wrapRequire(workspacePath);
  // if history size is specified and is positive, set as max repl history size. default is 1000
  const replHistorySize: number = +(<string>process.env.NODE_REPL_HISTORY_SIZE) || 1000;
  const replServer: repl.REPLServer = repl.start({
    prompt: '> ',
    historySize: replHistorySize
  });
  replServer.context.baapan = baapan;
  setupReplHistory(replServer, HOME_DIR);
}

process.on('exit', () => {
  if (shouldCleanup) {
    console.info('Cleaning up workspace...'.grey);
    cleanUpWorkspace(workspacePath);
  } else {
    console.info(`Workspace ${process.env.BAAPAN_WS_PATH} preserved!`.grey);
  }
});

startRepl();
