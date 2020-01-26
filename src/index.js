#!/usr/bin/env node
import os from 'os';
import path from 'path';
import BaapanREPLServer from './baapan';
import 'colors';

let workspacePath = process.env.BAAPAN_WS_PATH;
let persistWorkspace = true;
const HOME_DIR = os.homedir();

if (!workspacePath) {
  const WORKSPACE_DIR = `.baapan/workspace_${process.pid}_${Date.now()}`;
  workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);
  process.env.BAAPAN_WS_PATH = workspacePath;
  persistWorkspace = false;
}

const baapan = new BaapanREPLServer({
  persistWorkspace,
  workspacePath,
  homeDir: HOME_DIR,
  history: {
    enabled: true,
    path: process.env.NODE_REPL_HISTORY,
    size: +process.env.NODE_REPL_HISTORY_SIZE,
  },
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
