#!/usr/bin/env node
import repl from 'repl';
import os from 'os';
import path from 'path';
import {
  switchToWorkspace,
  wrapRequire,
  setupReplHistory,
  cleanUpWorkspace,
  baapan,
} from './core';
import 'colors';

let workspacePath = process.env.BAAPAN_WS_PATH;
let shouldCleanup = false;
const HOME_DIR = os.homedir();
if (!process.env.BAAPAN_WS_PATH) {
  const WORKSPACE_DIR = `.baapan/workspace_${process.pid}_${Date.now()}`;
  workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);
  process.env.BAAPAN_WS_PATH = workspacePath;
  shouldCleanup = true;
}

/**
 * Start baapan REPL
 */
function startRepl() {
  switchToWorkspace(workspacePath);
  wrapRequire(workspacePath);
  // if history size is specified and is positive, set as max repl history size. default is 1000
  const replHistorySize = +process.env.NODE_REPL_HISTORY_SIZE || 1000;
  const replServer = repl.start({ prompt: '> ', historySize: replHistorySize });
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
