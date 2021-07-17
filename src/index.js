#!/usr/bin/env node
import os from 'os';
import path from 'path';
import BaapanREPLServer from './baapan';
import 'colors';

let workspacePath = process.env.BAAPAN_WS_PATH;
let replHistoryPath = null;
let persistWorkspace = true;
const HOME_DIR = os.homedir();

if (!workspacePath) {
  const WORKSPACE_DIR = `.baapan/workspace_${process.pid}_${Date.now()}`;
  workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);
  process.env.BAAPAN_WS_PATH = workspacePath;
  persistWorkspace = false;
}

if (process.env.NODE_REPL_HISTORY === undefined || process.env.NODE_REPL_HISTORY !== '') {
  // if specified, set user specified path to node repl history
  replHistoryPath = path.join(HOME_DIR, '.node_repl_history');
  if (process.env.NODE_REPL_HISTORY) replHistoryPath = process.env.NODE_REPL_HISTORY;
}

const baapan = new BaapanREPLServer({
  persistWorkspace,
  workspacePath,
  homeDir: HOME_DIR,
  historyPath: replHistoryPath,
  historySize: +process.env.NODE_REPL_HISTORY_SIZE || 1000,
});

process.on('exit', () => {
  if (!persistWorkspace) {
    console.info('Cleaning up workspace...'.grey);
    baapan.cleanUpWorkspace();
  } else {
    console.info(`Workspace ${process.env.BAAPAN_WS_PATH} preserved!`.grey);
  }
});

baapan.startRepl();
