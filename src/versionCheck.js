import semver from 'semver';
import pkg from '../package.json';

const { engines } = pkg;

export default {
  currentNodeVersion: process.version,
  requiredNodeVersion: (engines && engines.node) || 'none',
  isSupportedNodeVersion() {
    if (engines && engines.node) {
      return semver.satisfies(process.version, engines.node);
    }
    return true;
  },
};
