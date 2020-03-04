import { statSync, readFileSync, writeFileSync } from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import { execSync } from 'child_process';
import { Module } from 'module';
import path from 'path';
import 'colors';
import repl from 'repl';

export default class BaapanREPLServer {
  constructor(options = {}) {
    const defaultOptions = {
      persistWorkspace: false,
      workspacePath: '',
      homeDir: '',
      historyPath: null,
      historySize: 1000,
      history: {
        enabled: false,
        path: null,
        size: 1000,
      },
    };
    this.options = {
      ...defaultOptions,
      ...options,
    };
    this.replServer = null;
  }

  static callerFile() {
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

  installModule(moduleName) {
    console.info(`Fetching and installing module '${moduleName}' from npm...`.grey.italic);
    execSync(`npm install --silent ${moduleName}`, { cwd: this.options.workspacePath });
    console.info('Done!'.grey.italic);
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
      console.info('Initializing workspace...'.grey);
      if (err.code === 'ENOENT') {
        execSync('npm init -y --scope baapan', { cwd: this.options.workspacePath });
      }
    }
  }

  initializeReplHistory() {
    try {
      readFileSync(this.options.historyPath).toString()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => this.replServer.history.push(line));
    } catch (err) {
      // can ignore this error.
      // error in persist history should not terminate the execution of code
    }
  }

  /**
     * Switch to the workspace directory
     */
  switchToWorkspace() {
    try {
      // Attempt to clean up any existing workspace
      if (!this.options.persistWorkspace) this.cleanUpWorkspace();
    } catch (err) {
      // Do nothing
    } finally {
      console.info('Creating workspace...'.grey);
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
      // Inject workspace node_modules directory
      this.paths.unshift(workspaceModulesDir);

      const moduleInfo = BaapanREPLServer.getModuleInfo(moduleName);

      try {
        return originalRequire.apply(this, [moduleName]);
      } catch (err) {
        if (!moduleInfo.isThirdPartyModule) throw err;

        self.installModule(moduleInfo.path);
        return originalRequire.apply(this, [
          path.join(self.options.workspacePath, 'node_modules', moduleName),
        ]);
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
