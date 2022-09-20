#!/usr/bin/env node

/// <reference types="node" />

import { createWriteStream, readFileSync } from 'fs';
import { argv } from 'process';
import { Writable } from 'stream';
import compile, { CompileParams, ScalarEntry } from './codegen';

class CliError extends Error {}

interface CliParams extends CompileParams {
  sourcePath: string;
  destinationPath: string;
}

const assertString = (value: unknown, name: string): string => {
  if (typeof value !== 'string')
    throw new CliError(
      `
Expected ${name} to be a string, but got ${typeof value}.
`.trim(),
    );
  return value;
};

const assertObject = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object')
    throw new CliError(
      `
Expected ${name} to be an object, but got ${typeof value}.
`.trim(),
    );
  return value as Record<string, unknown>;
};

const assertArray = (value: unknown, name: string): unknown[] => {
  if (!Array.isArray(value))
    throw new CliError(
      `
Expected ${name} to be an array, but got ${typeof value}.
`.trim(),
    );
  return value;
};

const printHelpAndExit = (): never => {
  console.log(
    `
Usage

  $ gql-in-ts SOURCE DESTINATION [--config CONFIG]
  $ gql-in-ts --config CONFIG

Arguments and options

          SOURCE  Path from which to read GraphQL schema. Reads from stdin if
                  the path is "-".
     DESTINATION  Path to which to write TypeScript representation of the
                  GraphQL schema. Writes to stdout if tha path is "-".
        --config  Path to the config file.
`.trim(),
  );
  process.exit(1);
};

const getParams = (args: string[]): CliParams => {
  const helpFlagPointer: string[] = [];
  const configurationPathPointer: string[] = [];
  const positionalArgumentsPointer: string[] = [];

  let pointer: string[] = positionalArgumentsPointer;
  for (const arg of args)
    switch (arg) {
      case '-h':
      case '--help':
        helpFlagPointer.push('');
        break;
      case '-c':
      case '--config':
        pointer = configurationPathPointer;
        break;
      default:
        if (/--?[a-zA-Z]+/.test(arg)) throw new CliError(`Unknown option: ${arg}.`);
        pointer.push(arg);

        // Assuming options take at most one argument.
        pointer = positionalArgumentsPointer;
    }

  if (helpFlagPointer.length) printHelpAndExit();

  if (positionalArgumentsPointer.length > 2)
    throw new CliError(
      `At most two arguments are expected, but ${positionalArgumentsPointer.length}.`,
    );

  const configurationPath = configurationPathPointer[0];
  let sourcePath = positionalArgumentsPointer[0];
  let destinationPath = positionalArgumentsPointer[1];
  let importPath = 'gql-in-ts';
  const scalars: ScalarEntry[] = [];

  if (configurationPath) {
    const configurationString = readFileSync(configurationPath, { encoding: 'utf8' });
    let parsedConfiguration: object;
    try {
      parsedConfiguration = assertObject(JSON.parse(configurationString), 'the configuration');
    } catch (e) {
      throw new CliError(`The configuration file is not a valid JSON document.`);
    }
    Object.entries(parsedConfiguration).forEach(([configKey, configValue]) => {
      switch (configKey) {
        case 'source':
          sourcePath = sourcePath || assertString(configValue, configKey);
          break;
        case 'destination':
          destinationPath = destinationPath || assertString(configValue, configKey);
          break;
        case 'importPath':
          importPath = assertString(configValue, configKey);
          break;
        case 'scalars':
          assertArray(configValue, configKey).forEach((scalarEntry, i) => {
            const { graphql, typescript } = assertObject(scalarEntry, `${configKey}[${i}]`);
            scalars.push({
              graphql: assertString(graphql, `${configKey}[${i}].graphql`),
              typescript: assertString(typescript, `${configKey}[${i}].typescript`),
            });
          });
          break;
        default:
          throw new CliError(`Unknown configuration key "${configKey}".`);
      }
    });
  }

  if (!sourcePath) throw new CliError(`Source path is not specified.`);
  if (!destinationPath) throw new CliError(`Destination path is not specified.`);

  return {
    sourcePath,
    destinationPath,
    importPath,
    scalars,
  };
};

const main = async () => {
  let params: CliParams;
  try {
    params = getParams(argv.slice(2));
  } catch (e) {
    if (e instanceof CliError) {
      console.error(`Error: ${e.message}\n`);
      printHelpAndExit();
    }
    throw e;
  }
  const source = readFileSync(params.sourcePath === '-' ? process.stdin.fd : params.sourcePath, {
    encoding: 'utf8',
  }).toString();
  const document = compile(source, params);
  const writable: Writable =
    params.destinationPath === '-'
      ? process.stdout
      : createWriteStream(params.destinationPath, 'utf8');
  writable.write(document, 'utf-8');
};

main();
