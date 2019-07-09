#!/usr/bin/env node
import os from 'os';
import path from 'path';
import { statSync } from 'fs';
import mkdirp from 'mkdirp';
import repl from 'repl';
import { execSync } from 'child_process';
import { Module } from 'module';
import 'colors';

const HOME_DIR = os.homedir();
const WORKSPACE_DIR = `.baapan/workspace_${process.pid}_${Date.now()}`;
const launchDir = process.cwd();
const workspacePath = path.join(HOME_DIR, WORKSPACE_DIR);
const workspaceModulesDir = path.join(workspacePath, 'node_modules');

process.env.BAAPAN_WS_PATH = workspacePath;
/**
 * Initialize workspace as an npm project
 * @param {string} wsPath Workspace Path
 */
function initializeWorkspace(wsPath) {
  try {
    statSync(path.join(wsPath, 'package.json'));
  } catch (err) {
    console.info('Initializing workspace...'.grey);
    if (err.code === 'ENOENT') {
      execSync('npm init -y --scope baapan', { cwd: workspacePath });
    }
  }
}

/**
 * Clean up workspace directory
 * @param {string} wsPath
 */
function cleanUpWorkspace(wsPath) {
  execSync(`rm -rf ${wsPath}`);
}

/**
 * Create workspace directory
 * @param {string} wsPath Workspace path
 */
function createWorkspace(wsPath) {
  mkdirp.sync(wsPath);
}

/**
 * Switch to the workspace directory
 * @param {string} wsPath Workspace path
 */
function switchToWorkspace(wsPath) {
  try {
    // Attempt to clean up any existing workspace
    cleanUpWorkspace(wsPath);
  } catch (err) {
    // Do nothing
  } finally {
    console.info('Creating workspace...'.grey);
    createWorkspace(wsPath);
    initializeWorkspace(wsPath);
    console.info('Workspace loaded!'.grey);
  }
}

/**
 * Install npm module onto the REPL
 * @param {string} moduleName Module name
 */
function installModule(moduleName) {
  console.info(`Fetching and installing module '${moduleName}' from npm...`.grey.italic);
  execSync(`npm install --silent ${moduleName}`, { cwd: workspacePath });
  console.info('Done!'.grey.italic);
}

/**
 * Get call site
 * @returns {string}
 */
function callerFile() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) { return stack; }; // eslint-disable-line func-names
  const err = new Error();
  Error.captureStackTrace(err);
  const { stack } = err;
  Error.prepareStackTrace = orig;

  const currentFile = stack.shift().getFileName();
  const ignoredCallers = ['internal/modules/cjs'];

  while (stack.length) {
    const callingFile = stack.shift().getFileName();
    if (callingFile !== currentFile && !ignoredCallers.includes(path.dirname(callingFile))) {
      return callingFile;
    }
  }

  return null;
}

/**
 * Check whether the provided module name is a local module
 * @param {string} moduleName
 */
function isLocalModule(moduleName) {
  return /^[/.]/.test(moduleName);
}

/**
 * Check whether the provided module is a native node module
 * @param {string} moduleName
 */
function isNativeModule(moduleName) {
  return Object.prototype.hasOwnProperty.call(
    process.binding('natives'),
    moduleName,
  );
}

/**
 * Get module absolute path
 * @param {string} modulePath
 */
function getModuleAbsPath(modulePath) {
  const caller = callerFile();
  return path.join(path.dirname(caller), modulePath);
}

/**
 * Get module details from the require'd path
 * @param {string} requiredPath
 */
function getModuleInfo(requiredPath) {
  let moduleInfo = {
    path: '',
    isLocalModule: isLocalModule(requiredPath),
    isNativeModule: false,
    isThirdPartyModule: false,
  };

  if (!requiredPath || typeof requiredPath !== 'string') {
    throw new Error('invalid module path');
  }

  if (requiredPath.startsWith(path.sep)) {
    moduleInfo = {
      ...moduleInfo,
      path: requiredPath,
    };
  } else if (requiredPath.startsWith('.')) {
    moduleInfo = {
      ...moduleInfo,
      path: getModuleAbsPath(requiredPath),
    };
  } else if (requiredPath.startsWith('@')) {
    moduleInfo = {
      ...moduleInfo,
      path: requiredPath.split('/').slice(0, 2).join('/'),
      isThirdPartyModule: true,
    };
  } else {
    const moduleReqPath = requiredPath.split('/')[0];
    const isNative = isNativeModule(moduleReqPath);
    moduleInfo = {
      ...moduleInfo,
      path: moduleReqPath,
      isThirdPartyModule: !isNative,
      isNativeModule: isNative,
    };
  }

  return moduleInfo;
}

/**
 * Load a module or install it an load if not already installed
 * @deprecated
 * @param {string} pkgName Module name to require
 */
function baapan(pkgName) {
  console.warn('use of \'baapan()\' is deprecated! You can now directly use \'require()\' instead. Isn\'t that cool?'.yellow);
  return require(pkgName);
}

/**
 * Wrap require() calls to dynamically install modules on-demand
 */
function wrapRequire() {
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (moduleName) {
    // Inject workspace node_modules directory
    this.paths.unshift(workspaceModulesDir);

    const moduleInfo = getModuleInfo(moduleName);

    try {
      return originalRequire.apply(this, [moduleName]);
    } catch (err) {
      if (!moduleInfo.isThirdPartyModule) throw err;

      installModule(moduleInfo.path);
      return originalRequire.apply(this, [
        path.join(workspacePath, 'node_modules', moduleName),
      ]);
    }
  };
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

process.on('exit', () => {
  console.info('Cleaning up workspace...'.grey);
  cleanUpWorkspace(workspacePath);
});

startRepl();
