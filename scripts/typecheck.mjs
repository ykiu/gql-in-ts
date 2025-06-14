import ts4_4 from 'ts4.4';
import ts4_5 from 'ts4.5';
import ts4_6 from 'ts4.6';
import ts4_7 from 'ts4.7';
import ts4_8 from 'ts4.8';
import ts4_9 from 'ts4.9';
import ts5_0 from 'ts5.0';
import ts5_1 from 'ts5.1';
import ts5_2 from 'ts5.2';
import ts5_3 from 'ts5.3';
import ts5_4 from 'ts5.4';
import ts5_5 from 'ts5.5';
import ts5_6 from 'ts5.6';
import ts5_7 from 'ts5.7';
import ts5_8 from 'ts5.8';
import * as path from 'path';
import { readFileSync } from 'fs';

const CONFIG_FILE_PATH = './tsconfig.test.json';

// This script runs tsc of different versions programatically.
// Most of the source code is taken from this issue comment:
// https://github.com/Microsoft/TypeScript/issues/6387#issuecomment-169739615

const readFile = (path) => readFileSync(path, { encoding: 'utf-8' });

// Having one version per line is handy when toggling versions to test.
// prettier-ignore
const diagnosticsCount = [
  ts4_4,
  ts4_5,
  ts4_6,
  ts4_7,
  ts4_8,
  ts4_9,
  ts5_0,
  ts5_1,
  ts5_2,
  ts5_3,
  ts5_4,
  ts5_5,
  ts5_6,
  ts5_7,
  ts5_8,
].map(
  (ts) => {
  const readConfigResult = ts.readConfigFile(CONFIG_FILE_PATH, readFile);
  if (readConfigResult.error) {
    console.log(readConfigResult.error);
    return;
  }
  const config = ts.parseJsonConfigFileContent(
    readConfigResult.config,
    ts.sys,
    path.dirname(CONFIG_FILE_PATH),
  );
  const compilerOptions = config.options;
  // Comment out the line below to debug loading of compiler options.
  // console.log(compilerOptions);
  const time1 = performance.now();
  const program = ts.createProgram(config.fileNames, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const time2 = performance.now();
  console.log(`Checking in TypeScript ${ts.version} yielded ${diagnostics.length} error(s). (took ${(time2 - time1).toFixed(2)}ms)`);
  diagnostics.forEach((diagnostic) => {
    let message = 'Error';
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      message += ` ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
    }
    message += ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.log(message);
  });
  return diagnostics.length;
}).reduce((acc, cur) => acc + cur, []);

process.exit(diagnosticsCount);
