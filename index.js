
const npm = require("npm");

global.baapan = async (module) => {
  return new Promise((resolve, reject) => {
    npm.load({
        loaded: false,
        loglevel: 'silent',
        force: true,
        progress: false
    }, function (err) {
      if (err) return reject(err);
      npm.commands.install([module], function (er, [[moduleName, modulePath]]) {
        if (er) return reject(er);
        return resolve(require(modulePath));
      });
    });
  });
}