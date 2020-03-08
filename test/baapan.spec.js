import { expect } from 'chai';
import proxyquire from 'proxyquire';
import { Module } from 'module';
import sinon from 'sinon';

let sandbox;
let fsStub;
let childProcessStub;
let replStub;
let rimrafStub;
let mkdirpStub;
let BaapanREPLServer;

const options = {
  persistWorkspace: true,
  workspacePath: '/some/ws/path',
  homeDir: '/home/johndoe',
  historyPath: '/home/johndoe/.repl_history',
  historySize: 9999,
};

describe('BaapanREPLServer instance', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fsStub = {
      statSync: sandbox.stub(),
      readFileSync: sandbox.stub(),
      writeFileSync: sandbox.stub(),
    };
    childProcessStub = { execSync: sandbox.stub() };
    mkdirpStub = { sync: sandbox.stub() };
    rimrafStub = { sync: sandbox.stub() };
    replStub = { start: sandbox.stub() };
    BaapanREPLServer = proxyquire.noCallThru().load('../src/baapan', {
      fs: fsStub,
      child_process: childProcessStub,
      repl: replStub,
      rimraf: rimrafStub,
      mkdirp: mkdirpStub,
    }).default;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('when instantiated', () => {
    it('should create repl server instance with provided configuration', () => {
      const baapan = new BaapanREPLServer(options);
      expect(baapan.options.persistWorkspace).to.equal(options.persistWorkspace);
      expect(baapan.options.workspacePath).to.equal(options.workspacePath);
      expect(baapan.options.homeDir).to.equal(options.homeDir);
      expect(baapan.options.historyPath).to.equal(options.historyPath);
      expect(baapan.options.historySize).to.equal(options.historySize);
    });

    it('should use default configurations if options are not provided', () => {
      const baapan = new BaapanREPLServer({});
      expect(baapan.options.persistWorkspace).to.equal(false);
      expect(baapan.options.workspacePath).to.equal('');
      expect(baapan.options.homeDir).to.equal('');
      expect(baapan.options.historyPath).to.equal(null);
      expect(baapan.options.historySize).to.equal(1000);
    });
  });

  describe('when BaapanREPLServer.prototype.installModule is called', () => {
    it('should install the provided module using npm install command', () => {
      const baapan = new BaapanREPLServer(options);
      baapan.installModule('foomodule');
      expect(childProcessStub.execSync.withArgs(
        'npm install --silent foomodule',
        { cwd: options.workspacePath },
      ).calledOnce).to.equal(true);
    });
  });

  describe('when BaapanREPLServer.prototype.createWorkspace is called', () => {
    it('should create the workspace directory', () => {
      const baapan = new BaapanREPLServer(options);
      baapan.createWorkspace();
      expect(mkdirpStub.sync.withArgs(options.workspacePath).calledOnce).to.equal(true);
    });
  });

  describe('when BaapanREPLServer.prototype.initializeWorkspace is called', () => {
    it('should do nothing if the package.json in the workspace already exists', () => {
      const baapan = new BaapanREPLServer(options);
      baapan.initializeWorkspace();
      expect(childProcessStub.execSync.called).to.equal(false);
    });

    it('should initialize the workspace as an npm module, if no package.json found in the workspace', () => {
      fsStub.statSync.throws({ code: 'ENOENT' });
      const baapan = new BaapanREPLServer(options);
      baapan.initializeWorkspace();
      expect(childProcessStub.execSync.withArgs(
        'npm init -y --scope baapan',
        { cwd: options.workspacePath },
      ).calledOnce).to.equal(true);
    });
  });

  describe('when BaapanREPLServer.prototype.initializeReplHistory is called', () => {
    it('should populate the repl server history from the global history file', () => {
      fsStub.readFileSync.returns('console.log(123) \nconst abc = 123 \nrequire(\'fs\') ');
      const baapan = new BaapanREPLServer(options);
      baapan.replServer = { history: [] };
      baapan.initializeReplHistory();
      expect(baapan.replServer.history).to.have.members([
        'console.log(123)',
        'const abc = 123',
        'require(\'fs\')',
      ]);
    });
  });

  describe('when BaapanREPLServer.prototype.switchToWorkspace is called', () => {
    it('should clean up existing workspace and recreate if persistWorkspace option is set to false', () => {
      sandbox.stub(BaapanREPLServer.prototype, 'cleanUpWorkspace');
      sandbox.stub(BaapanREPLServer.prototype, 'createWorkspace');
      sandbox.stub(BaapanREPLServer.prototype, 'initializeWorkspace');

      const baapan = new BaapanREPLServer({ ...options, persistWorkspace: false });
      baapan.switchToWorkspace();
      expect(baapan.cleanUpWorkspace.called).to.equal(true);
      expect(baapan.createWorkspace.called).to.equal(true);
      expect(baapan.initializeWorkspace.called).to.equal(true);
    });

    it('should not clean up user provided workspace if persistWorkspace option is set to true', () => {
      sandbox.stub(BaapanREPLServer.prototype, 'cleanUpWorkspace');
      sandbox.stub(BaapanREPLServer.prototype, 'createWorkspace');
      sandbox.stub(BaapanREPLServer.prototype, 'initializeWorkspace');

      const baapan = new BaapanREPLServer(options);
      baapan.switchToWorkspace();
      expect(baapan.cleanUpWorkspace.called).to.equal(false);
      expect(baapan.createWorkspace.called).to.equal(true);
      expect(baapan.initializeWorkspace.called).to.equal(true);
    });
  });

  describe('when BaapanREPLServer.prototype.setupReplHistory is called', () => {
    it('should initialize repl history and create history listener', () => {
      sandbox.stub(BaapanREPLServer.prototype, 'initializeReplHistory');
      sandbox.stub(BaapanREPLServer.prototype, 'addReplHistoryListener');
      const replServerStub = { history: ['somehistory'] };
      const baapan = new BaapanREPLServer(options);
      baapan.replServer = replServerStub;
      const historyPath = '/foo/bar/history';

      baapan.setupReplHistory(historyPath);
      expect(
        baapan.initializeReplHistory
          .withArgs(replServerStub, historyPath)
          .calledOnce,
      ).to.equal(true);
      expect(
        baapan.addReplHistoryListener
          .withArgs(replServerStub, historyPath)
          .calledOnce,
      ).to.equal(true);
    });
  });

  describe('when BaapanREPLServer.prototype.wrapRequire wraps require() function', () => {
    let requireStub;
    let baapan;

    describe('wrapped require() function', () => {
      beforeEach(() => {
        requireStub = sandbox.stub(Module.prototype, 'require');
        sandbox.stub(BaapanREPLServer, 'getModuleInfo');
        sandbox.stub(BaapanREPLServer.prototype, 'installModule');
        baapan = new BaapanREPLServer(options);
        baapan.wrapRequire();
      });
      it('should require() and return the required module if the module was found locally', () => {
        const moduleObj = { foo: 'bar' };
        requireStub.withArgs('some_module').returns(moduleObj);
        expect(require('some_module')).to.eql(moduleObj); // eslint-disable-line import/no-unresolved
      });

      it('should install any third party module and then require it, if not installed in the workspace', () => {
        BaapanREPLServer.getModuleInfo.withArgs('some_module').returns({
          isThirdPartyModule: true,
          path: 'some_module',
        });
        const moduleObj = { foo: 'bar' };
        requireStub.withArgs('some_module').throws(new Error('Cannot find module \'some_module\''));
        requireStub.withArgs('/some/ws/path/node_modules/some_module').returns(moduleObj);
        expect(require('some_module')).to.equal(moduleObj); // eslint-disable-line import/no-unresolved
      });

      it('should throw an error, if the third party module is neither installed in the workspace nor could be installed', () => {
        BaapanREPLServer.getModuleInfo.withArgs('some_module').returns({
          isThirdPartyModule: true,
          path: 'some_module',
        });
        const moduleInstallError = new Error('could not install module');

        requireStub.withArgs('some_module').throws(new Error('Cannot find module \'some_module\''));
        baapan.installModule.withArgs('some_module').throws(moduleInstallError);
        expect(require.bind(null, 'some_module')).to.throw(moduleInstallError);
      });

      it('should throw an error, if a relative/native module could not be located locally', () => {
        BaapanREPLServer.getModuleInfo.withArgs('some_native_module').returns({
          isThirdPartyModule: false,
          path: 'some_native_module',
        });
        const requireError = new Error('Cannot find module \'some_module\'');

        requireStub.withArgs('some_native_module').throws(requireError);
        expect(require.bind(null, 'some_native_module')).to.throw(requireError);
      });
    });
  });
});
