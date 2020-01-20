import { statSync, readFileSync, writeFileSync } from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import { execSync } from 'child_process';
import { Module } from 'module';
import path from 'path';
import 'colors';

/**
 * Initialize workspace as an npm project
 * @param {string} wsPath Workspace Path
 */
export function initializeWorkspace(wsPath) {
  try {
    statSync(path.join(wsPath, 'package.json'));
  } catch (err) {
    console.info('Initializing workspace...'.grey);
    if (err.code === 'ENOENT') {
      execSync('npm init -y --scope baapan', { cwd: wsPath });
    }
  }
}

/**
 * Clean up workspace directory
 * @param {string} wsPath
 */
export function cleanUpWorkspace(wsPath) {
  rimraf.sync(wsPath);
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
export function switchToWorkspace(wsPath, { cleanUp = true } = {}) {
  try {
    // Attempt to clean up any existing workspace
    if (cleanUp) cleanUpWorkspace(wsPath);
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
export function installModule(moduleName, wsPath) {
  console.info(`Fetching and installing module '${moduleName}' from npm...`.grey.italic);
  execSync(`npm install --silent ${moduleName}`, { cwd: wsPath });
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
export function isLocalModule(moduleName) {
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
export function baapan(pkgName) {
  console.warn('use of \'baapan()\' is deprecated! You can now directly use \'require()\' instead. Isn\'t that cool?'.yellow);
  return require(pkgName);
}

/**
 * Wrap require() calls to dynamically install modules on-demand
 */
export function wrapRequire(wsPath) {
  const workspaceModulesDir = path.join(wsPath, 'node_modules');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (moduleName) {
    // Inject workspace node_modules directory
    this.paths.unshift(workspaceModulesDir);

    const moduleInfo = getModuleInfo(moduleName);

    try {
      return originalRequire.apply(this, [moduleName]);
    } catch (err) {
      if (!moduleInfo.isThirdPartyModule) throw err;

      installModule(moduleInfo.path, wsPath);
      return originalRequire.apply(this, [
        path.join(wsPath, 'node_modules', moduleName),
      ]);
    }
  };
}

/**
 * Add entered line to repl history
 * @param {Object} server
 */
function addReplHistoryListener(server, replHistoryPath) {
  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'return') {
      try {
        writeFileSync(replHistoryPath, server.history.join('\n')); // write new server history to repl
      } catch (err) {
        // can ignore this error.
        // error in writing history should not terminate the execution of code
      }
    }
  });
}

/**
 * Initialize baapan repl history
 * @param {Object} server
 */
function initializeReplHistory(server, replHistoryPath) {
  try {
    readFileSync(replHistoryPath).toString()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => server.history.push(line));
  } catch (err) {
    // can ignore this error.
    // error in persist history should not terminate the execution of code
  }
}

export function setupReplHistory(replServer, homeDir) {
  // repl history should persist only if it's enabled
  if (process.env.NODE_REPL_HISTORY === undefined || process.env.NODE_REPL_HISTORY !== '') {
    // if specified, set user specified path to node repl history
    let replHistoryPath = path.join(homeDir, '.node_repl_history');
    if (process.env.NODE_REPL_HISTORY) replHistoryPath = process.env.NODE_REPL_HISTORY;
    initializeReplHistory(replServer, replHistoryPath);
    addReplHistoryListener(replServer, replHistoryPath);
  }
}
