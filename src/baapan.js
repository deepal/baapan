import { statSync, readFileSync, writeFileSync } from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import { execSync } from 'child_process';
import { Module } from 'module';
import path from 'path';
import 'colors';
import repl from 'repl';
import compatibility from './versionCheck';

export default class BaapanREPLServer {
  constructor(options = {}) {
    const defaultOptions = {
      persistWorkspace: false,
      workspacePath: '',
      homeDir: '',
      historyPath: null,
      historySize: 1000,
    };
    this.options = {
      ...defaultOptions,
      ...options,
    };
    this.replServer = null;
  }

  static callerFile() {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) { // eslint-disable-line func-names
      return stack;
    };
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

  installModule(moduleName) {
    console.info(`Fetching and installing module '${moduleName}' from npm...`.grey.italic);
    try {
      execSync(`npm install --silent ${moduleName}`, { cwd: this.options.workspacePath });
      console.info('Done!'.grey.italic);
    } catch (err) {
      const e = new Error(`Could not install module! ${err.message || 'Unknown Error'}`.red);
      e.stack = null;
      throw e;
    }
  }

  /**
     * Create workspace directory
     */
  createWorkspace() {
    mkdirp.sync(this.options.workspacePath);
  }

  /**
     * Initialize workspace as an npm project
     */
  initializeWorkspace() {
    try {
      statSync(path.join(this.options.workspacePath, 'package.json'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        execSync('npm init -y --scope baapan', { cwd: this.options.workspacePath });
      }
    }
    mkdirp.sync(path.join(this.options.workspacePath, 'node_modules'));
  }

  initializeReplHistory() {
    if (this.replServer && Array.isArray(this.replServer.history)) {
      try {
        readFileSync(this.options.historyPath).toString()
          .split('\n')
          .map((line) => line.trim())
          .forEach((line) => this.replServer.history.push(line));
      } catch (err) {
        // can ignore this error.
        // error in persist history should not terminate the execution of code
      }
    }
  }

  /**
     * Switch to the workspace directory
     */
  switchToWorkspace() {
    try {
      if (!this.options.persistWorkspace) this.cleanUpWorkspace();
    } catch (err) {
      // Do nothing
    } finally {
      console.info(`Switching to workspace ${this.options.workspacePath}`.grey);
      // If persisted workspace is provided, createWorkspace() will return without creating it again
      this.createWorkspace();
      this.initializeWorkspace();
      console.info('Workspace loaded!'.grey);
    }
  }

  setupReplHistory(historyPath) {
    this.initializeReplHistory(this.replServer, historyPath);
    this.addReplHistoryListener(this.replServer, historyPath);
  }

  wrapRequire() {
    const self = this;
    const workspaceModulesDir = path.join(this.options.workspacePath, 'node_modules');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (moduleName) {
      // This is required in node versions >= 12.3.0
      if (!this.paths.includes(process.cwd())) this.paths.unshift(process.cwd());
      // The following behaviour is broken in latest node versions.
      // Skip it if the node version is not supported
      if (compatibility.isSupportedNodeVersion() && !this.paths.includes(workspaceModulesDir)) {
        this.paths.unshift(workspaceModulesDir);
      }
      try {
        return originalRequire.call(this, moduleName);
      } catch (err) {
        const moduleInfo = BaapanREPLServer.getModuleInfo(moduleName);
        if (!moduleInfo.isThirdPartyModule) throw err;

        self.installModule(moduleInfo.path);
        return originalRequire.call(this, path.join(self.options.workspacePath, 'node_modules', moduleName));
      }
    };
  }

  addReplHistoryListener() {
    process.stdin.on('keypress', (_, key) => {
      if (key.name === 'return') {
        try {
          writeFileSync(this.options.historyPath, this.replServer.history.join('\n')); // write new server history to repl
        } catch (err) {
          // can ignore this error.
          // error in writing history should not terminate the execution of code
        }
      }
    });
  }

  static isLocalModule(moduleName) {
    return /^[/.]/.test(moduleName);
  }

  static isNativeModule(moduleName) {
    return Object.prototype.hasOwnProperty.call(
      process.binding('natives'),
      moduleName,
    );
  }

  static getModuleAbsPath(modulePath) {
    const caller = BaapanREPLServer.callerFile();
    return path.join(path.dirname(caller), modulePath);
  }

  static getModuleInfo(requiredPath) {
    let moduleInfo = {
      path: '',
      isLocalModule: BaapanREPLServer.isLocalModule(requiredPath),
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
        path: BaapanREPLServer.getModuleAbsPath(requiredPath),
      };
    } else if (requiredPath.startsWith('@')) {
      moduleInfo = {
        ...moduleInfo,
        path: requiredPath.split('/').slice(0, 2).join('/'),
        isThirdPartyModule: true,
      };
    } else {
      const moduleReqPath = requiredPath.split('/')[0];
      const isNative = BaapanREPLServer.isNativeModule(moduleReqPath);
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
     * Clean up workspace directory
     */
  cleanUpWorkspace() {
    rimraf.sync(this.options.workspacePath);
  }

  startRepl() {
    this.switchToWorkspace();
    this.wrapRequire();
    this.replServer = repl.start({ prompt: '> ', historySize: this.options.historySize });
    if (this.options.historyPath) this.setupReplHistory(this.options.historyPath);
  }
}
