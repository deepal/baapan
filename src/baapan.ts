import { execSync } from 'child_process';
import 'colors';
import { readFileSync, statSync, writeFileSync } from 'fs';
import mkdirp from 'mkdirp';
import { Module } from 'module';
import path from 'path';
import { REPLServer } from 'repl';
import rimraf from 'rimraf';

interface IExtendedProcess extends NodeJS.Process {
  binding(type: string): object;
}

interface IVerboseError {
  message?: string;
  code?: string;
  stack: string | NodeJS.CallSite[];
}

interface IModuleInfo {
  path: string;
  isLocalModule: boolean;
  isNativeModule: boolean;
  isThirdPartyModule: boolean;
}

interface IWorkspaceEntryOptions {
  cleanUp: boolean;
}

interface IKeyPressEventData {
  sequence: string;
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

interface IBaapanREPLServer extends REPLServer {
  history: string[];
}

type IPrepareStackTrace = ((err: Error, stackTraces: NodeJS.CallSite[]) => NodeJS.CallSite[]) | undefined;

/**
 * Initialize workspace as an npm project
 * @param wsPath Workspace Path
 */
export function initializeWorkspace(wsPath: string): void {
  try {
    statSync(path.join(wsPath, 'package.json'));
  } catch (err) {
    console.info('Initializing workspace...'.grey);
    if ((<IVerboseError>err).code === 'ENOENT') {
      execSync('npm init -y --scope baapan', { cwd: wsPath });
    }
  }
}

/**
 * Clean up workspace directory
 * @param wsPath Workspace path
 */
export function cleanUpWorkspace(wsPath: string): void {
  rimraf.sync(wsPath);
}

/**
 * Create workspace directory
 * @param wsPath Workspace path
 */
function createWorkspace(wsPath: string): void {
  mkdirp.sync(wsPath);
}

/**
 * Switch to the workspace directory
 * @param wsPath Workspace path
 */
export function switchToWorkspace(wsPath: string, { cleanUp = true }: IWorkspaceEntryOptions): void {
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
 * @param moduleName Module name
 */
export function installModule(moduleName: string, wsPath: string): void {
  console.info(`Fetching and installing module '${moduleName}' from npm...`.grey.italic);
  execSync(`npm install --silent ${moduleName}`, { cwd: wsPath });
  console.info('Done!'.grey.italic);
}

/**
 * Get call site
 */
function callerFile(): (string | undefined) {
  const orig: IPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_: Error, callStack: NodeJS.CallSite[]): NodeJS.CallSite[] => callStack; // eslint-disable-line func-names
  const err: IVerboseError = <IVerboseError>new Error();
  Error.captureStackTrace(err);
  const stack: NodeJS.CallSite[] = <NodeJS.CallSite[]>err.stack;
  Error.prepareStackTrace = orig;

  const currentFile: string = <string>stack.shift()?.getFileName();
  const ignoredCallers: string[] = ['internal/modules/cjs'];

  while (stack.length > 0) {
    const callingFile: string = <string>stack.shift()?.getFileName();
    if (callingFile !== currentFile && !ignoredCallers.includes(path.dirname(callingFile))) {
      return callingFile;
    }
  }

  return undefined;
}

/**
 * Check whether the provided module name is a local module
 * @param moduleName Module name
 */
export function isLocalModule(moduleName: string): boolean {
  return /^[/.]/.test(moduleName);
}

/**
 * Check whether the provided module is a native node module
 * @param moduleName Module name
 */
function isNativeModule(moduleName: string): boolean {
  return <boolean>(
    Object.prototype.hasOwnProperty.call(
      (<IExtendedProcess>process).binding('natives'),
      moduleName
    )
  );
}

/**
 * Get module absolute path
 * @param modulePath Module Path
 */
function getModuleAbsPath(modulePath: string): string {
  const functionCaller: (string|undefined) = callerFile();
  if (functionCaller === undefined) {
    throw new Error(`Could not derive absolute path of module : ${modulePath}`);
  }
  return path.join(path.dirname(functionCaller), modulePath);
}

/**
 * Get module details from the require'd path
 * @param requiredPath Required path
 */
function getModuleInfo(requiredPath: string): IModuleInfo {
  let moduleInfo: IModuleInfo = {
    path: '',
    isLocalModule: isLocalModule(requiredPath),
    isNativeModule: false,
    isThirdPartyModule: false
  };

  if (requiredPath === '' || typeof requiredPath !== 'string') {
    throw new Error('invalid module path');
  }

  if (requiredPath.startsWith(path.sep)) {
    moduleInfo = {
      ...moduleInfo,
      path: requiredPath
    };
  } else if (requiredPath.startsWith('.')) {
    moduleInfo = {
      ...moduleInfo,
      path: getModuleAbsPath(requiredPath)
    };
  } else if (requiredPath.startsWith('@')) {
    moduleInfo = {
      ...moduleInfo,
      path: requiredPath.split('/').slice(0, 2).join('/'),
      isThirdPartyModule: true
    };
  } else {
    const moduleReqPath: string = requiredPath.split('/')[0];
    const isNative: boolean = isNativeModule(moduleReqPath);
    moduleInfo = {
      ...moduleInfo,
      path: moduleReqPath,
      isThirdPartyModule: !isNative,
      isNativeModule: isNative
    };
  }

  return moduleInfo;
}

/**
 * Wrap require() calls to dynamically install modules on-demand
 */
export function wrapRequire(wsPath: string): void {
  const workspaceModulesDir: string = path.join(wsPath, 'node_modules');
  const originalRequire: NodeJS.Require = Module.prototype.require;
  Module.prototype.require = <NodeJS.Require>function (moduleName: string): any { //tslint:disable-line no-any
    // Inject workspace node_modules directory
    const self: NodeJS.Module = <NodeJS.Module>this; //tslint:disable-line no-invalid-this
    self.paths.unshift(workspaceModulesDir);

    const moduleInfo: IModuleInfo = getModuleInfo(moduleName);

    try {
      return originalRequire.apply(self, [moduleName]);
    } catch (err) {
      if (!moduleInfo.isThirdPartyModule) throw err;

      installModule(moduleInfo.path, wsPath);
      return originalRequire.apply(self, [
        path.join(wsPath, 'node_modules', moduleName)
      ]);
    }
  };
}

/**
 * Add entered line to repl history
 * @param server REPL Server
 */
function addReplHistoryListener(server: IBaapanREPLServer, replHistoryPath: string): void {
  process.stdin.on('keypress', (str: string, key: IKeyPressEventData): void => {
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
 * @param server REPL Server
 */
function initializeReplHistory(server: IBaapanREPLServer, replHistoryPath: string): void {
  try {
    readFileSync(replHistoryPath).toString()
      .split('\n')
      .filter((line: string): string => line.trim())
      .map((line: string): number => server.history.push(line));
  } catch (err) {
    // can ignore this error.
    // error in persist history should not terminate the execution of code
  }
}

export function setupReplHistory(replServer: IBaapanREPLServer, homeDir: string): void {
  // repl history should persist only if it's enabled
  if (process.env.NODE_REPL_HISTORY === undefined || process.env.NODE_REPL_HISTORY !== '') {
    // if specified, set user specified path to node repl history
    let replHistoryPath: string = path.join(homeDir, '.node_repl_history');
    if (process.env.NODE_REPL_HISTORY !== undefined) replHistoryPath = process.env.NODE_REPL_HISTORY;
    initializeReplHistory(replServer, replHistoryPath);
    addReplHistoryListener(replServer, replHistoryPath);
  }
}
