#!/usr/bin/env node
import os from 'os';
import path from 'path';
import {mkdirSync, statSync} from 'fs';
import repl from 'repl';
import {execSync} from 'child_process';

const HOME_DIR = os.homedir();
const WORKSPACE_DIR = '.baapan/workspace';
const workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);

/**
 * Initialize workspace as an npm project
 * @param {string} wsPath Workspace Path
 */
function initializeWorkspace(wsPath) {
  process.chdir(wsPath);
  try {
    statSync(path.join(wsPath, 'package.json'));
  } catch (err) {
    console.log('Initializing workspace...');
    if (err.code === 'ENOENT') {
      execSync('npm init -y --scope baapan');
    }
  }
}

/**
 * Create workspace directory
 * @param {string} wsPath Workspace path
 */
function createWorkspace(wsPath) {
  mkdirSync(wsPath, {recursive: true});
  process.chdir(wsPath);
}

/**
 * Switch to the workspace directory
 * @param {string} wsPath Workspace path
 */
function switchToWorkspace(wsPath) {
  try {
    // Attempt to clean up any existing workspace
    execSync(`rm -rf ${wsPath}`);
  } catch (err) {
    // Do nothing
  } finally {
    console.log('Creating workspace...');
    createWorkspace(wsPath);
    initializeWorkspace(wsPath);
    console.log(`Workspace loaded!`);
  }
}

/**
 * Install npm module onto the REPL
 * @param {string} moduleName Module name
 */
function installModule(moduleName) {
  console.log(`Baapan '${moduleName}' into the workspace!!`);
  execSync(`npm install --silent --save-exact ${moduleName}`);
}

/**
 * Parse module name from the require'd module path
 * @param {string} moduleStr Module name/path
 */
function parseModulePath(moduleStr) {
    if (typeof moduleStr === 'string') {
      const tokens = moduleStr.split('/');
      if (tokens.length && tokens[0].startsWith('@')) {
        // Scoped npm module. e.g, @babel/register
        return [tokens.slice(0,2).join('/')];
      }
      const [moduleName, ...subDirs] = tokens;
      return [moduleName, subDirs.join('/')];
    }

    return [];
}

/**
 * Load a module or install it an load if not already installed
 * @param {string} pkgName Module name to require
 */
function baapan (pkgName) {
  const [moduleName] = parseModulePath(pkgName);

  if (!moduleName) {
    return console.error('Invalid module name provided!');
  }

  const absoluteModulePath = path.join(process.cwd(), './node_modules', pkgName);
  try {
    require.resolve(absoluteModulePath);
  } catch (err) {
    installModule(moduleName);
  }

  try {
    return require(absoluteModulePath);
  } catch (err) {
    console.log(`Could not load module '${pkgName}'`);
  }
}

/**
 * Start baapan REPL
 */
function startRepl() {
  switchToWorkspace(workspacePath);
  const replServer = repl.start('> ');
  replServer.context.baapan = baapan;
}

startRepl();