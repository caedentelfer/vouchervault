const path = require('node:path');
const programDir = path.join(__dirname, 'program');
const idlDir = path.join(programDir, 'idl');
const sdkDir = path.join(__dirname, 'tests', 'generated');
const binaryInstallDir = path.join(__dirname, '.crates');

module.exports = {
  idlGenerator: 'shank',
  programName: 'gideon',
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};