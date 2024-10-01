const path = require('node:path');
const programDir = path.join(__dirname, '../gideon/program');
const idlDir = path.join(programDir, 'idl');
const sdkDir = path.join(__dirname, 'src', 'generated');
const binaryInstallDir = path.join(__dirname, '.crates');

module.exports = {
  idlGenerator: 'shank',
  programName: 'gideon',
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};