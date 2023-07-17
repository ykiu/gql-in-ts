/// <reference lib="es2020" />

import {
  buildSchema,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLNullableType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
} from 'graphql';

export interface ScalarEntry {
  graphql: string;
  typescript: string;
}

export interface CompileParams {
  importPath: string;
  scalars: readonly ScalarEntry[];
}

const indent = (rows: string[]) => {
  return rows.map((row) => `  ${row}`);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const expectValueToBeNever = (value: never): never => {
  throw new Error('Unexpected to reach here.');
};

const compileDocument = (schema: GraphQLSchema, params: CompileParams): string[] => {
  const scalars = new Map([
    // GraphQL built-in scalars
    // https://spec.graphql.org/June2018/#sec-Scalars
    ['Int', 'number'],
    ['Float', 'number'],
    ['String', 'string'],
    ['Boolean', 'boolean'],
    ['ID', 'string'],
    ...params.scalars.map(({ graphql, typescript }) => [graphql, typescript] as const),
  ]);

  const compileNullableTypeReference = (type: GraphQLNullableType): string => {
    if (type instanceof GraphQLScalarType) return type.name;
    if (type instanceof GraphQLObjectType) return type.name;
    if (type instanceof GraphQLInterfaceType) return type.name;
    if (type instanceof GraphQLUnionType) return type.name;
    if (type instanceof GraphQLEnumType) return type.name;
    if (type instanceof GraphQLInputObjectType) return type.name;
    if (type instanceof GraphQLList) return `List<${compileTypeReference(type.ofType)}>`;
    return expectValueToBeNever(type);
  };
  const compileNonNullTypeReference = (type: GraphQLNonNull<any>): string =>
    compileNullableTypeReference(type.ofType);

  const compileTypeReference = (type: GraphQLType): string => {
    if (type instanceof GraphQLNonNull) return compileNonNullTypeReference(type);
    return `Nullable<${compileNullableTypeReference(type)}>`;
  };

  const compileInputFieldOrArgument = (fieldOrArgument: GraphQLInputField | GraphQLArgument) => {
    return [`${fieldOrArgument.name}: { type: ${compileTypeReference(fieldOrArgument.type)} };`];
  };

  const compileArguments = (args: readonly GraphQLArgument[]) => {
    if (args.length)
      return [`arguments: {`, ...indent(args.flatMap(compileInputFieldOrArgument)), '};'];
    return [`arguments: {};`];
  };

  const compileOutputField = (field: GraphQLField<any, any, any>): string[] => {
    return [
      `${field.name}: {`,
      ...indent(compileArguments(field.args)),
      `  type: ${compileTypeReference(field.type)};`,
      `};`,
    ];
  };

  const compileSpreadField = (
    type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
  ): string[] => {
    return [
      `"...": {`,
      ...indent(compileArguments([])),
      `  type: ${compileNullableTypeReference(type)};`,
      `};`,
    ];
  };

  const compileTypedSpreadField = (
    type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
  ): string[] => {
    return [
      `"... on ${type.name}": {`,
      ...indent(compileArguments([])),
      `  type: ${compileNullableTypeReference(type)};`,
      `};`,
    ];
  };

  const compileTypenameField = (
    types: readonly (GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType)[],
  ): string[] => {
    return [
      `__typename: {`,
      ...indent(compileArguments([])),
      `  type: Predicate<${
        types.length ? types.map((type) => `"${type.name}"`).join(' | ') : 'never'
      }>;`,
      `};`,
    ];
  };

  const compileOutputObjectType = (type: GraphQLObjectType) => {
    const fields = Object.values(type.getFields());
    return [
      `export type ${type.name} = {`,
      ...indent(compileTypenameField([type])),
      ...indent(fields.flatMap(compileOutputField)),
      ...indent(compileSpreadField(type)),
      '}',
      '',
    ];
  };

  const compileInterfaceType = (type: GraphQLInterfaceType): string[] => {
    const fields = Object.values(type.getFields());
    const possibleTypes = schema.getPossibleTypes(type);
    return [
      `export type ${type.name} = {`,
      ...indent(compileTypenameField(possibleTypes)),
      ...indent(fields.flatMap(compileOutputField)),
      ...indent(compileSpreadField(type)),
      ...indent(possibleTypes.flatMap(compileTypedSpreadField)),
      '}',
      '',
    ];
  };

  const compileUnionType = (type: GraphQLUnionType): string[] => {
    const possibleTypes = schema.getPossibleTypes(type);
    return [
      `export type ${type.name} = {`,
      ...indent(compileTypenameField(possibleTypes)),
      ...indent(compileSpreadField(type)),
      ...indent(possibleTypes.flatMap(compileTypedSpreadField)),
      '}',
      '',
    ];
  };

  const compileInputObjectType = (type: GraphQLInputObjectType): string[] => {
    const fields = Object.values(type.getFields());
    return [
      `export type ${type.name} = {`,
      ...indent(fields.flatMap(compileInputFieldOrArgument)),
      '}',
      '',
    ];
  };

  const compileEnumType = (type: GraphQLEnumType): string[] => {
    return [
      `export type ${type.name} = Predicate<`,
      ...indent(type.getValues().map((value) => `| "${value.name}"`)),
      `>`,
      '',
    ];
  };

  const compileNamedType = (type: GraphQLNamedType): string[] => {
    if (type instanceof GraphQLObjectType) return compileOutputObjectType(type);
    if (type instanceof GraphQLInputObjectType) return compileInputObjectType(type);
    if (type instanceof GraphQLEnumType) return compileEnumType(type);
    if (type instanceof GraphQLScalarType) return [];
    if (type instanceof GraphQLInterfaceType) return compileInterfaceType(type);
    if (type instanceof GraphQLUnionType) return compileUnionType(type);
    return expectValueToBeNever(type);
  };

  const compileSchema = (): string[] => {
    const fields: string[] = [];
    const queryType = schema.getQueryType();
    if (queryType) fields.push(`query: ${queryType.name};`);
    const mutationType = schema.getMutationType();
    if (mutationType) fields.push(`mutation: ${mutationType.name};`);
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) fields.push(`subscription: ${subscriptionType.name};`);
    return [`export type Schema = {`, ...indent(fields), '}', ''];
  };

  const generateScalarMapping = () => {
    return [
      ...Array.from(scalars.entries()).map(
        ([graphqlName, typescriptName]) => `type ${graphqlName} = Predicate<${typescriptName}>;`,
      ),
      '',
    ];
  };

  const generateTypeMap = (): string[] => {
    const outputCompositeTypes: GraphQLNamedType[] = [];
    const inputTypes: GraphQLNamedType[] = [];
    Object.values(schema.getTypeMap()).forEach((type) => {
      if (
        type instanceof GraphQLObjectType ||
        type instanceof GraphQLInterfaceType ||
        type instanceof GraphQLUnionType
      )
        outputCompositeTypes.push(type);
      if (
        type instanceof GraphQLInputObjectType ||
        type instanceof GraphQLScalarType ||
        type instanceof GraphQLEnumType
      )
        inputTypes.push(type);
    });
    return [
      `export type OutputCompositeTypeMap = {`,
      ...indent(outputCompositeTypes.map((type) => `${type.name}: ${type.name};`)),
      `};`,
      '',
      `export type InputTypeMap = {`,
      ...indent(inputTypes.map((type) => `${type.name}: ${type.name};`)),
      `};`,
      '',
    ];
  };

  const header = [
    `// This file is auto-generated with gql-in-ts`,
    ``,
    `import {`,
    `  List,`,
    `  Nullable,`,
    `  Predicate,`,
    `  makeGraphql,`,
    `  makeCompileGraphQL,`,
    `  makeDefineVariables,`,
    `} from '${params.importPath}';`,
    '',
  ];

  const footer = [
    `export const graphql = makeGraphql<OutputCompositeTypeMap, InputTypeMap>();`,
    `export const compileGraphQL = makeCompileGraphQL<InputTypeMap, Schema>();`,
    `export type { Resolved, Selection, GraphQLString } from '${params.importPath}';`,
    `export const defineVariables = makeDefineVariables<InputTypeMap>();`,
    '',
  ];
  return [
    ...header,
    ...generateScalarMapping(),
    ...compileSchema(),
    ...Object.values(schema.getTypeMap()).flatMap((type) => compileNamedType(type)),
    ...generateTypeMap(),
    ...footer,
  ];
};

const compile = (source: string, params: CompileParams): string => {
  const schema = buildSchema(source);
  return compileDocument(schema, params).join('\n');
};

export default compile;
