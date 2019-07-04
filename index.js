#!/usr/bin/env node
import os from 'os';
import path from 'path';
import {statSync} from 'fs';
import mkdirp from 'mkdirp';
import repl from 'repl';
import {execSync} from 'child_process';
import { Module } from 'module';

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
  mkdirp.sync(wsPath);
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

function getAbsoluteModulePath(pkgName) {
  const [moduleName] = parseModulePath(pkgName);

  if (!moduleName) {
    return console.error('Invalid module name provided!');
  }

  return {
    path: path.join(process.cwd(), './node_modules', pkgName),
    name: moduleName
  };
}

/**
 * Load a module or install it an load if not already installed
 * @deprecated
 * @param {string} pkgName Module name to require
 */
function baapan (pkgName) {
  console.warn('use of \'baapan()\' is deprecated! You can now directly use \'require()\' instead. Isn\'t that cool?');
  return require(pkgName);
}

/**
 * Wrap require() calls to dynamically install modules on-demand
 */
function wrapRequire() {
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function(moduleName, ...args) {
    const isLocalModule = /^[\/\.]/.test(moduleName);
    const isNativeModule = process.binding("natives").hasOwnProperty(moduleName);

    if (isLocalModule || isNativeModule) {
      return originalRequire.call(this, moduleName, ...args);
    }

    const requiredModule = getAbsoluteModulePath(moduleName);

    try {
      require.resolve(requiredModule.path);
    } catch (err) {
      // module not found
      installModule(requiredModule.name);
    }
    return originalRequire.call(this, requiredModule.path, ...args);
  }
}

/**
 * Start baapan REPL
 */
function startRepl() {
  switchToWorkspace(workspacePath);
  wrapRequire();
  const replServer = repl.start('> ');
  replServer.context.baapan = baapan;
}

startRepl();