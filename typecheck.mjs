// import ts4_1 from 'ts4.1';
// import ts4_2 from 'ts4.2';
// import ts4_3 from 'ts4.3';
import ts4_4 from 'ts4.4';
import ts4_5 from 'ts4.5';
import ts4_6 from 'ts4.6';
import ts4_7 from 'ts4.7';
import ts4_8 from 'ts4.8';
import * as path from 'path';
// import tsconfig from './tsconfig.json' assert { type: 'json' };
import { readFileSync } from 'fs';

const CONFIG_FILE_PATH = './tsconfig.json';

// https://github.com/Microsoft/TypeScript/issues/6387#issuecomment-169739615
const readFile = (path) => readFileSync(path, { encoding: 'utf-8' });

// prettier-ignore
const diagnosticsCount = [
  // ts4_1,
  // ts4_2,
  // ts4_3,
  ts4_4,
  ts4_5,
  ts4_6,
  ts4_7,
  ts4_8,
].map((ts) => {
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
  const program = ts.createProgram(config.fileNames, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  console.log(`Checking in TypeScript ${ts.version} yielded ${diagnostics.length} error(s).`);
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
