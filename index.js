
const npm = require('npm');
const {join} = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;

function parsePath(module) {
    if (typeof module === 'string') {
      const [moduleName, ...subDirs] = module.split('/');
      return [moduleName, subDirs.join('/')];
    }
    return [];
}

global.baapan = async (...args) => {
  const module = args[0];
  const [moduleName, subDir] = parsePath(module);

  if (!moduleName) {
    return console.error('Invalid module name provided!');
  }

  return new Promise((resolve, reject) => {
    try {
      resolve(require(...args));
    } catch (err) {
      npm.load({
          loaded: false,
          loglevel: 'silent',
          force: true,
          progress: false
      }, function (err) {
        if (err) return reject(err);
        npm.commands.install([moduleName], function (er, [[mName, mPath]]) {
          if (er) return reject(er);
          return resolve(require(join(mPath, subDir)));
        });
      });
    }
  });
}
