
require('babel-polyfill');
const npm = require('npm');

function parsePath(module) {
    if (typeof module === 'string') {
      const [moduleName, ...subDirs] = module.split('/');
      return [moduleName, subDirs.join('/')];
    }
    return [];
}

global.baapan = async (module) => {
  const [moduleName] = parsePath(module);

  if (!moduleName) {
    return console.error('Invalid module name provided!');
  }

  return new Promise((resolve, reject) => {
    try {
      resolve(require(module));
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
          return resolve(require(module));
        });
      });
    }
  });
}