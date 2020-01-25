const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { isLocalModule } = require('../core');

describe('isLocaleModule tests', () => {
  it('should return true if module is a locale module', () => {
    expect(isLocalModule('./test')).to.equal(true);
  });

  it('should return false if module is not a locale module', () => {
    expect(isLocalModule('express')).to.equal(false);
  });
});

describe('initializeWorkspace tests', () => {
  it('should do return immediately if the workspace is already initialized', () => {
    const execSync = sinon.stub();
    const statSync = sinon.stub();
    const { initializeWorkspace } = proxyquire.noCallThru().load('../core', {
      child_process: { execSync },
      fs: { statSync },
    });

    initializeWorkspace('/some/path');
    expect(statSync.withArgs('/some/path/package.json').calledOnce).to.be.equal(true);
    expect(execSync.called).to.be.equal(false);
  });

  it('should setup workspace if the workspace is not already initialized', () => {
    const execSync = sinon.stub();
    const statSync = sinon.stub().throws({ code: 'ENOENT' });
    const { initializeWorkspace } = proxyquire.noCallThru().load('../core', {
      child_process: { execSync },
      fs: { statSync },
    });

    initializeWorkspace('/some/path');
    expect(statSync.calledOnce).to.be.equal(true);
    expect(execSync.withArgs('npm init -y --scope baapan', { cwd: '/some/path' }).calledOnce).to.be.equal(true);
  });
});

describe('switchToWorkspace Tests', () => {
  it('should create and initialize workspace clearing up any existing workspace', () => {
    const rimrafSync = sinon.stub();
    const mkdirpSync = sinon.stub();
    const execSync = sinon.stub();
    const statSync = sinon.stub();
    const { switchToWorkspace } = proxyquire.noCallThru().load('../core.js', {
      child_process: { execSync },
      fs: { statSync },
      rimraf: { sync: rimrafSync },
      mkdirp: { sync: mkdirpSync },
    });

    switchToWorkspace('/some/path', { cleanUp: true });
    expect(rimrafSync.withArgs('/some/path').calledOnce).to.be.equal(true);
    expect(mkdirpSync.withArgs('/some/path').calledOnce).to.be.equal(true);
    expect(statSync.withArgs('/some/path/package.json').calledOnce).to.be.equal(true);
    expect(execSync.called).to.be.equal(false);
  });

  it('should immediately create and initialize workspace if there\'s no any existing workspace', () => {
    const rimrafSync = sinon.stub();
    const mkdirpSync = sinon.stub();
    const execSync = sinon.stub();
    const statSync = sinon.stub();
    const { switchToWorkspace } = proxyquire.noCallThru().load('../core.js', {
      child_process: { execSync },
      fs: { statSync },
      rimraf: { sync: rimrafSync },
      mkdirp: { sync: mkdirpSync },
    });

    switchToWorkspace('/some/path', { cleanUp: false });
    expect(rimrafSync.withArgs('/some/path').calledOnce).to.be.equal(false);
    expect(mkdirpSync.withArgs('/some/path').calledOnce).to.be.equal(true);
    expect(statSync.withArgs('/some/path/package.json').calledOnce).to.be.equal(true);
    expect(execSync.called).to.be.equal(false);
  });
});

describe('installModule tests', () => {
  it('should install module', () => {
    const execSync = sinon.stub();
    const { installModule } = proxyquire.noCallThru().load('../core.js', {
      child_process: { execSync },
    });

    installModule('someModule', '/some/path');
    expect(execSync.withArgs('npm install --silent someModule', { cwd: '/some/path' }).calledOnce).to.be.equal(true);
  });
});

describe('setupReplHistory tests', () => {
  it('should persist repl history if repl history configs are as default', () => {
    const backupHistoryPath = process.env.NODE_REPL_HISTORY;
    delete process.env.NODE_REPL_HISTORY;
    const readFileSync = sinon.stub();
    const writeFileSync = sinon.stub();
    const replServer = { history: [] };
    const keypressSpy = sinon.spy(process.stdin, 'on');

    const { setupReplHistory } = proxyquire.noCallThru().load('../core.js', {
      fs: { readFileSync, writeFileSync },
    });

    setupReplHistory(replServer, '/some/path');
    expect(readFileSync.withArgs('/some/path/.node_repl_history').calledOnce).to.be.equal(true);
    expect(keypressSpy.calledOnce).to.be.equal(true);

    process.env.NODE_REPL_HISTORY = backupHistoryPath;
    keypressSpy.restore();
  });

  it('should persist repl history using the specified path if it is specified by the user', () => {
    const backupHistoryPath = process.env.NODE_REPL_HISTORY;
    process.env.NODE_REPL_HISTORY = '/repl/path';
    const readFileSync = sinon.stub();
    const writeFileSync = sinon.stub();
    const replServer = { history: [] };
    const keypressSpy = sinon.spy(process.stdin, 'on');

    const { setupReplHistory } = proxyquire.noCallThru().load('../core.js', {
      fs: { readFileSync, writeFileSync },
    });

    setupReplHistory(replServer, '/some/path');
    expect(readFileSync.withArgs('/repl/path').calledOnce).to.be.equal(true);
    expect(keypressSpy.calledOnce).to.be.equal(true);

    process.env.NODE_REPL_HISTORY = backupHistoryPath;
    keypressSpy.restore();
  });

  it('should not persist repl history if repl history is disabled', () => {
    const backupHistoryPath = process.env.NODE_REPL_HISTORY;
    process.env.NODE_REPL_HISTORY = '';
    const replServer = { history: [] };
    const readFileSync = sinon.stub();
    const writeFileSync = sinon.stub();
    const keypressSpy = sinon.spy(process.stdin, 'on');

    const { setupReplHistory } = proxyquire.noCallThru().load('../core.js', {
      fs: { readFileSync, writeFileSync },
    });

    setupReplHistory(replServer, '/some/path');
    expect(readFileSync.called).to.be.equal(false);
    expect(keypressSpy.called).to.be.equal(false);

    process.env.NODE_REPL_HISTORY = backupHistoryPath;
    keypressSpy.restore();
  });
});
