import { readFile, writeFile } from 'fs/promises';
import { argv } from 'process';

import {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  TypeNode,
  parse,
  SchemaDefinitionNode,
} from 'graphql';

const scalars = {
  // GraphQL built-in scalars
  // https://spec.graphql.org/June2018/#sec-Scalars
  Int: 'number',
  Float: 'number',
  String: 'string',
  Boolean: 'boolean',
  ID: 'string',
};

const processNamedType = (node: NamedTypeNode) => {
  const name = node.name.value;
  if (name in scalars) {
    return `Predicate<${scalars[name as keyof typeof scalars]}>`;
  }
  return name;
};

const processListType = (node: ListTypeNode): string => `List<${processType(node.type)}>`;

type BareTypeNode = NamedTypeNode | ListTypeNode;

const processBareType = (node: BareTypeNode) => {
  switch (node.kind) {
    case 'NamedType':
      return processNamedType(node);
    case 'ListType':
      return processListType(node);
    default:
      throw new Error('unknown type');
  }
};

const processNonNullType = (node: NonNullTypeNode): string => processBareType(node.type);

const processNullableType = (node: BareTypeNode) => `Nullable<${processBareType(node)}>`;

const processType = (node: TypeNode) => {
  switch (node.kind) {
    case 'NonNullType':
      return processNonNullType(node);
    default:
      return processNullableType(node);
  }
};

const processInputValueDefinition = (node: InputValueDefinitionNode) =>
  `${node.name.value}: { type: ${processType(node.type)} }`;

const processFieldDefinition = (node: FieldDefinitionNode) => `{
  arguments: {${(node.arguments || []).map(processInputValueDefinition).join(';\n')}};
  type: ${processType(node.type)};
}`;

const processSchemaDefinition = (node: SchemaDefinitionNode) => {
  return `export type Schema = {${node.operationTypes
    .map((node) => `${node.operation}: ${node.type.name.value}`)
    .join(';\n')}};`;
};

const processObjectTypeOrInterfaceDefinition = (
  node: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
) => {
  const fields = node.fields || [];
  const fieldNames = fields.map((f) => f.name.value);
  const processedFields = fields.map(processFieldDefinition);
  return `export type ${node.name.value} = {${processedFields
    .map((entry, i) => `${fieldNames[i]}: ${entry}`)
    .join(';\n  ')};
    '...': {
      arguments: {};
      type: ${node.name.value};
    }
  };`;
};

const processInputObjectTypeDefinition = (node: InputObjectTypeDefinitionNode) => {
  const fields = node.fields || [];
  const processedFields = fields.map(processInputValueDefinition);
  return `export type ${node.name.value} = {${processedFields.join(';\n  ')}};`;
};

const processEnumTypeDefinition = (node: EnumTypeDefinitionNode) => {
  const name = node.name.value;
  const values = (node.values || []).map((n) => n.name.value);
  const valuesDeclaration = `const ${name}Values = [${values
    .map((v) => `"${v}"`)
    .join(', ')}] as const;`;
  const typeDeclaration = `type ${name} = Predicate<typeof ${name}Values extends readonly (infer T)[] ? T : never>;`;
  // const predicateDeclaration = `const is${name} = (value: any): value is ${name} => ${name}Values.includes(value);`;
  return `${valuesDeclaration}
${typeDeclaration}`;
};

const processScalarTypeDefinition = (node: ScalarTypeDefinitionNode) => {
  const name = node.name.value;
  return `type ${name} = Predicate<string>;`;
};

const processDefinition = (node: DefinitionNode) => {
  switch (node.kind) {
    case 'SchemaDefinition':
      return processSchemaDefinition(node);
    case 'ObjectTypeDefinition':
    case 'InterfaceTypeDefinition':
      return processObjectTypeOrInterfaceDefinition(node);
    case 'InputObjectTypeDefinition':
      return processInputObjectTypeDefinition(node);
    case 'EnumTypeDefinition':
      return processEnumTypeDefinition(node);
    case 'ScalarTypeDefinition':
      return processScalarTypeDefinition(node);
    default:
      return '';
  }
};

const isOfKind =
  <TKind extends ASTNode['kind']>(kind: TKind) =>
  (node: ASTNode): node is ASTNode & { kind: TKind } =>
    node.kind === kind;

const buildObjectTypeByName = (node: DocumentNode) => {
  const objectTypeEntries = node.definitions
    .filter(isOfKind('ObjectTypeDefinition'))
    .map(({ name }) => `"${name.value}": ${name.value};`);

  return `type ObjectTypeNamespace = {
    ${objectTypeEntries.join('\n')}
  };`;
};

const buildInputTypeByName = (node: DocumentNode) => {
  const scalarEntries = Object.entries(scalars).map(
    ([graphqlName, typescriptName]) => `"${graphqlName}": Predicate<${typescriptName}>`,
  );
  const inputObjectTypeEntries = node.definitions
    .filter(isOfKind('InputObjectTypeDefinition'))
    .map(({ name }) => `"${name.value}": ${name.value};`);
  return `export type InputTypeNamespace = {
    ${[...scalarEntries, ...inputObjectTypeEntries].join('\n')}
  };`;
};

const buildHeader = (params: {
  importPath: string;
}) => `// This file is auto-generated with compileGraphqlSchema.ts.

import {
  List,
  Nullable,
  Predicate,
  makeGraphql,
  makeCompileGraphQL,
} from '${params.importPath}';`;

const footer = `export const graphql = makeGraphql<ObjectTypeNamespace, InputTypeNamespace>();
export const compileGraphQL = makeCompileGraphQL<InputTypeNamespace, Schema>();
`;

const compile = (source: string, params: { importPath: string }) => {
  const ast = parse(source);
  const header = buildHeader(params);
  const definitions = ast.definitions.map(processDefinition).filter(Boolean);
  const objectSchemaMapping = buildObjectTypeByName(ast);
  const inputObjectSchemaMapping = buildInputTypeByName(ast);
  const document = `${header}
${definitions.join('\n')}
${objectSchemaMapping}
${inputObjectSchemaMapping}
${footer}`;
  return document;
};

const parseArgs = (args: string[]) => {
  const iter = args[Symbol.iterator]();

  const error = (msg: string) => {
    console.log(`Error: ${msg}`);
    process.exit(1);
  };
  const nextOrError = (msg: string) => {
    const { done, value } = iter.next();
    if (done) error(msg);
    return value;
  };

  let sourcePath = '';
  let destPath = '';
  let importPath = './lib/graphql';

  const positionalArguments: string[] = [];

  for (const v of iter) {
    if (v.startsWith('-')) {
      // process options
      if (v === '--import-path') {
        importPath = nextOrError(`"--import-path" requires one argument.`);
      } else {
        error(`Unknown option: "${v}"`);
      }
    } else {
      positionalArguments.push(v);
    }
  }

  if (positionalArguments.length !== 2)
    error(`Exactly two positional arguments expected, but ${positionalArguments.length} given.`);
  [sourcePath, destPath] = positionalArguments;

  return {
    sourcePath,
    destPath,
    importPath,
  };
};

const main = async () => {
  const params = parseArgs(argv.slice(2));
  const source = await readFile(params.sourcePath, { encoding: 'utf8' });
  const document = compile(source, params);
  await writeFile(params.destPath, document);
};

main();
