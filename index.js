#!/usr/bin/env node
import repl from 'repl';
import {
  switchToWorkspace,
  wrapRequire,
  setupReplHistory,
  cleanUpWorkspace,
  baapan,
  configParams,
} from './core';
import 'colors';

/**
 * Start baapan REPL
 */
function startRepl() {
  switchToWorkspace(configParams.workspacePath);
  wrapRequire();
  // if history size is specified and is positive, set as max repl history size. default is 1000
  const replHistorySize = +process.env.NODE_REPL_HISTORY_SIZE || 1000;
  const replServer = repl.start({ prompt: '> ', historySize: replHistorySize });
  replServer.context.baapan = baapan;
  setupReplHistory(replServer);
}

process.on('exit', () => {
  if (configParams.shouldCleanup) {
    console.info('Cleaning up workspace...'.grey);
    cleanUpWorkspace(configParams.workspacePath);
  } else {
    console.info(`Workspace ${process.env.BAAPAN_WS_PATH} preserved!`.grey);
  }
});

startRepl();
