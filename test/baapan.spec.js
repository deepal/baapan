import { expect } from 'chai';
import proxyquire from 'proxyquire';
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
});
