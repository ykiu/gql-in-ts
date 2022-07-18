// ---------
// constants
// ---------

const SELECT = true as const;
type SELECTType = typeof SELECT;

// -------------------------
// Types for defining schema
// -------------------------

type InputType = InputObjectType | Predicate | Wrapper<any>;

type InputObjectType = {
  [key: string]: InputObjectTypeEntry;
};

type InputObjectTypeEntry<TSchemaType extends InputType = InputType> = {
  type: TSchemaType;
};

export type Predicate<T = unknown> = (value: unknown) => value is T;

type Wrapper<T extends OutputType> = {
  __wrapped: T;
};

export type Nullable<T extends InputType> = {
  __wrapper: 'nullable';
  __wrapped: T;
};

export type List<T extends InputType> = {
  __wrapper: 'list';
  __wrapped: T;
};

type OutputType = OutputObjectType | Predicate | Wrapper<any>;

export type OutputObjectType = {
  [key: string]: OutputObjectTypeEntry;
};

type OutputObjectTypeEntry = {
  arguments: InputObjectType;
  type: OutputType;
};

type ObjectTypeNamespace = Record<string, OutputObjectType>;
type InputTypeNamespace = Record<string, InputType>;

// ------------------------------
// Types that represent variables
// ------------------------------

type InputTypeValue<TInputType extends InputType> = TInputType extends Predicate<infer U>
  ? U // Primitive type
  : TInputType extends InputObjectType
  ? InputObjectTypeValue<TInputType> // Object
  : TInputType extends List<infer TWrapped>
  ? InputTypeValue<TWrapped>[] // Array of another type
  : TInputType extends Nullable<infer TWrapped>
  ? InputTypeValue<TWrapped> | null // Nullable of another type
  : never;

type InputObjectTypeValue<TInputObjectType extends InputObjectType> = {
  [TKey in keyof TInputObjectType as TInputObjectType[TKey] extends InputObjectTypeEntry<
    Nullable<any>
  >
    ? never
    : TKey]: LiteralOrVariable<InputTypeValue<TInputObjectType[TKey]['type']>>;
} & {
  [TKey in keyof TInputObjectType as TInputObjectType[TKey] extends InputObjectTypeEntry<
    Nullable<any>
  >
    ? TKey
    : never]?: LiteralOrVariable<InputTypeValue<TInputObjectType[TKey]['type']>>;
};

export type LiteralOrVariable<T extends InputTypeValue<InputType>> =
  | T
  | (T extends InputTypeValue<infer TSchemaType> ? VariableReference<TSchemaType> : never);

type VariableReference<TType extends InputType, TDefinition = VariableReferenceDefinition> = {
  __type?: TType;
  __definition: TDefinition;
};

type VariableReferenceDefinition<
  TInputTypeNamespace extends InputTypeNamespace = InputTypeNamespace,
> =
  | NonNullableReference<TInputTypeNamespace, any>
  | ListReference<TInputTypeNamespace, any>
  | (keyof TInputTypeNamespace & string);

type NonNullableReference<
  TInputTypeNamespace extends InputTypeNamespace,
  TDefinition extends VariableReferenceDefinition<TInputTypeNamespace>,
> = `${TDefinition}!`;

type ListReference<
  TInputTypeNamespace extends InputTypeNamespace,
  TDefinition extends VariableReferenceDefinition<TInputTypeNamespace>,
> = `[${TDefinition}]`;

type UnwrapNullable<T extends InputType> = T extends Nullable<infer U> ? U : T;

type VariableReferenceType<
  TInputTypeNamespace extends InputTypeNamespace,
  TDefinition extends VariableReferenceDefinition<TInputTypeNamespace>,
> = TDefinition extends keyof TInputTypeNamespace
  ? Nullable<TInputTypeNamespace[TDefinition]>
  : TDefinition extends ListReference<TInputTypeNamespace, infer T>
  ? Nullable<List<VariableReferenceType<TInputTypeNamespace, T>>>
  : TDefinition extends NonNullableReference<TInputTypeNamespace, infer T>
  ? UnwrapNullable<VariableReferenceType<TInputTypeNamespace, T>>
  : never;

export type VariableReferences<
  TInputTypeNamespace extends InputTypeNamespace,
  TVariableDefinitions extends VariableDefinitions<TInputTypeNamespace>,
> = {
  [TKey in keyof TVariableDefinitions]: VariableReference<
    VariableReferenceType<TInputTypeNamespace, TVariableDefinitions[TKey]>
  >;
};

type VariableDefinitions<TInputTypeNamespace extends InputTypeNamespace> = Record<
  string,
  VariableReferenceDefinition<TInputTypeNamespace>
>;

export type VariableReferenceValues<
  TInputTypeNamespace extends InputTypeNamespace,
  TVariableDefinitions extends VariableDefinitions<TInputTypeNamespace>,
> = InputObjectTypeValue<{
  [TKey in keyof TVariableDefinitions]: {
    type: VariableReferenceType<TInputTypeNamespace, TVariableDefinitions[TKey]>;
  };
}>;

// -------------------------------------------
// Types for making selections (a.k.a queries)
// -------------------------------------------

export type Selection<TOutputObjectType extends OutputObjectType> = {
  [TKey in keyof TOutputObjectType as TKey | AliasKey<TKey & string>]?: TKey extends AliasKey<
    infer TSchemaKey
  >
    ? SelectionEntry<TOutputObjectType[TSchemaKey]> // Selection with alias
    : SelectionEntry<TOutputObjectType[TKey]>; // Selection without alias
};

type AliasKey<
  TSchemaKey extends string,
  TAlias extends string = string,
> = `${TSchemaKey} as ${TAlias}`;

type SpreadableKey = `...${string}`;

type SelectionEntry<TOutputObjectTypeEntry extends OutputObjectTypeEntry> = SelectionEntryShape<
  InputObjectTypeValue<TOutputObjectTypeEntry['arguments']>,
  SelectionType<TOutputObjectTypeEntry['type']>
>;

type SelectionEntryShape<
  TSelectionArgument extends InputObjectTypeValue<any>,
  TSelectionType extends SelectionType<any>,
> = {} extends TSelectionArgument // Check if all the arguments are optional
  ? { 0: TSelectionArgument; 1: TSelectionType } | TSelectionType
  : { 0: TSelectionArgument; 1: TSelectionType };

type SelectionType<TOutputType extends OutputType> = TOutputType extends OutputObjectType
  ? Selection<TOutputType>
  : TOutputType extends Predicate
  ? SELECTType
  : TOutputType extends Wrapper<infer TWrapped>
  ? SelectionType<TWrapped>
  : never;

// ----------------------------------------
// Types for inferring the type of response
// ----------------------------------------

export type Result<
  TSelectionWrapper extends GetterOrLiteral<Selection<OutputObjectType>>,
  TOutputObjectType extends OutputObjectType = never,
> = TSelectionWrapper extends GetterOrLiteral<infer TSelection>
  ? TSelectionWrapper extends HasOutputObjectType<infer InferredOutputObjectType>
    ? ResultOrNever<InferredOutputObjectType, RecursivelyMergeSpreads<TSelection>>
    : ResultOrNever<TOutputObjectType, RecursivelyMergeSpreads<TSelection>>
  : never;

type ResultOrNever<
  TOutputObjectType extends OutputObjectType,
  TSelection, // intentionally no constraint, because TS cannot figure out
  // RecursivelyMergeSpreads<Selection<T>> is a Selection<T>
> = TSelection extends Selection<TOutputObjectType>
  ? ResultForOutputObjectType<TOutputObjectType, TSelection>
  : {
      [k in ERROR_FAILED_OBTAIN_TYPE_FROM_SELECTION]: TSelection;
    };

type ERROR_FAILED_OBTAIN_TYPE_FROM_SELECTION =
  'The Result<> type failed to infer which type your query is for. This typically happens when you forgot to wrap your query with the graphql() function exported from your schema.ts. Either wrap your query like graphql("YourTypeName")({ /* your query */ }), or if you cannot do that for whatever reasons, explicitly specify the target type like Result<typeof yourQuery, YourTypeName>';

type HasOutputObjectType<TOutputObjectType extends OutputObjectType = OutputObjectType> = {
  __type?: TOutputObjectType;
};

type GetterOrLiteral<T> = T | ((...args: any) => T);

type ResultForOutputObjectType<
  TOutputObjectType extends OutputObjectType,
  TSelection extends Selection<TOutputObjectType>,
> = {
  [TKey in keyof TSelection as TKey extends AliasKey<string, infer TAlias>
    ? TAlias
    : TKey]: TKey extends AliasKey<infer TSchemaKey>
    ? ResultEntry<TOutputObjectType[TSchemaKey], TSelection[TKey]> // Selection with alias
    : TKey extends keyof TOutputObjectType
    ? ResultEntry<TOutputObjectType[TKey], TSelection[TKey]> // Selection without alias
    : never;
};

/**
 * { a: true, '...': { b: true, '...': { c: true } } }
 * to { a: [{}, true], b: [{}, true], c: [{}, true] }
 */
export type RecursivelyMergeSpreads<TSelection extends Selection<OutputObjectType>> = MergeSpreads<{
  [TKey in keyof TSelection]: TSelection[TKey] extends SelectionEntryShape<
    infer TSelectionArgument,
    infer TSubSelection
  >
    ? TSubSelection extends Selection<OutputObjectType>
      ? // The field has a sub-selection.
        // Recurse into the sub-selection and normalize the shape of the field to
        // [arg, sub-selection].
        { 0: TSelectionArgument; 1: RecursivelyMergeSpreads<TSubSelection> }
      : // The field does not have a sub-selection.
        // Just normalize its shape to [arg, true].
        { 0: TSelectionArgument; 1: TSubSelection }
    : // Cannot determine the shape of the field.
      // This happens when inferring the general response type
      // for a type without specifying a query.
      TSelection[TKey];
}>;

/**
 * { a: [{}, true], '...': [{}, { b: [{}, true], '...': [{}, { c: [{}, true] }] }] }
 * to { a: [{}, true], b: [{}, true], '...': [{}, { c: [{}, true] }] }
 */
type MergeSpreads<T> = Omit<T, SpreadableKey> &
  UnionToIntersection<ValueOf<ValueOf<T, SpreadableKey>, 1>>;

type ValueOf<TSrc, TKey extends string | number | symbol> = TSrc extends {
  [k in TKey]: infer TValue;
}
  ? TValue
  : never;

/**
 * (A | B | ... | Z) to (A & B & ... & Z)
 *
 * Original source: https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 *
 * This is a TypeScript trick that leverages ditributive conditional types and inference from conditional types.
 *
 * The following part:
 *
 * (T extends any ? ((v: T) => void) : never)
 *
 * is a "distributive conditional type". Distributive conditional types are automatically
 * distributed over union types during instantiation.
 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types
 *
 * Now, the next part:
 *
 * (...) extends (v2: infer U) => void ? U : never
 *
 * infers the type parameter U. Since U is in a contra-variant position, if there're multiple
 * candidates for U, what's going to be inferred is an intersection of all of them.
 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types
 *
 * Say you pass in A | B as a parameter to this type. The first part becomes:
 *
 * (v: A) => void | (v: B) => void
 *
 * because that part is a distributive conditional. Now, the type parameter U in
 *
 * ((v: A) => void | (v: B) => void) extends (v2: infer U) => void ? U : never
 *
 * is inferred as A & B because there're multiple candidates (A and B) for U.
 */
type UnionToIntersection<T> = (T extends any ? (v: T) => void : never) extends (v2: infer U) => void
  ? U
  : never;

type ResultEntry<
  TOutputObjectTypeEntry extends OutputObjectTypeEntry,
  TSelectionEntry extends SelectionEntry<any> | undefined,
> = TSelectionEntry extends SelectionEntryShape<any, infer TSelection>
  ? ResultType<TOutputObjectTypeEntry['type'], TSelection>
  : never;

type ResultType<
  TInputType extends InputType,
  TSelectionType extends SelectionType<any>,
> = TInputType extends Predicate<infer U>
  ? TSelectionType extends SELECTType
    ? U // Primitive type
    : never
  : TInputType extends OutputObjectType
  ? TSelectionType extends Selection<TInputType>
    ? ResultForOutputObjectType<TInputType, TSelectionType> // Object
    : never
  : TInputType extends List<infer TWrapped>
  ? ResultType<TWrapped, TSelectionType>[] // Array of another type
  : TInputType extends Nullable<infer TWrapped>
  ? ResultType<TWrapped, TSelectionType> | null // Nullable of another type
  : never;

// -----------------------------------------------------------------
// Types for expressing compiled queries, mutations or subscriptions
// -----------------------------------------------------------------

export type GraphQLString<TResult, TVariableValues> = string & {
  __result?: TResult;
  __takeVariableValues?: (variableValues: TVariableValues) => void;
};

// -----------------------------------------------------------
// Functions for compiling queries, mutations or subscriptions
// -----------------------------------------------------------

const normalizeEntry = <TOutputObjectTypeEntry extends OutputObjectTypeEntry>(
  selectionEntry: SelectionEntry<TOutputObjectTypeEntry>,
) => {
  if (Array.isArray(selectionEntry)) {
    return selectionEntry;
  }
  return [{}, selectionEntry];
};

const compileKey = (key: string) => {
  const match = /(.+) as (.+)/.exec(key);
  if (match) {
    return `${match[2]}: ${match[1]}`;
  }
  return key;
};

const isVariableObject = (value: unknown): value is VariableReference<InputType> =>
  typeof value === 'object' && value != null && '__definition' in value;

const compileArgument = (
  arg: unknown,
  nameByVariable: Map<VariableReference<any>, string>,
): string => {
  if (typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'boolean')
    return JSON.stringify(arg);
  if (Array.isArray(arg))
    return `[${arg.map((a) => compileArgument(a, nameByVariable)).join(', ')}]`;
  if (isVariableObject(arg)) {
    const name = nameByVariable.get(arg);
    if (name == null) throw new Error(`Encountered an untracked variable.`);
    return `$${name}`;
  }
  if (typeof arg === 'object' && arg != null)
    return `{${Object.entries(arg)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${compileArgument(v, nameByVariable)}`)
      .join(', ')}}`;
  throw new Error(`Unknown object ${arg}`);
};

const deepEqual = (value1: unknown, value2: unknown): boolean => {
  if (value1 && value2 && typeof value1 === 'object' && typeof value2 === 'object') {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every(
      (k1) =>
        Object.prototype.hasOwnProperty.call(value2, k1) &&
        deepEqual((value1 as any)[k1], (value2 as any)[k1]),
    );
  }
  return value1 === value2;
};

export const mergeSelections = <
  TSelection1 extends Selection<OutputObjectType>,
  TSelection2 extends Selection<OutputObjectType>,
>(
  selection1: TSelection1,
  selection2: TSelection2,
): TSelection1 & TSelection2 => {
  const destination: any = { ...selection1 };
  Object.entries(selection2).forEach(([key, entry2]) => {
    const entry1 = selection1[key];
    if (!entry2) {
      destination[key] = entry1;
      return;
    }
    if (!entry1) {
      destination[key] = entry2;
      return;
    }
    const [args1, subSelection1] = normalizeEntry(entry2);
    const [args2, subSelection2] = normalizeEntry(entry1);
    if (!deepEqual(args1, args2))
      throw new Error(
        `Cannot merge selections. Saw conflicting arguments: ${JSON.stringify(
          args1,
        )} != ${JSON.stringify(args2)}`,
      );
    if (subSelection1 === SELECT && subSelection2 === SELECT) {
      destination[key] = [args1, SELECT];
      return;
    }
    if (typeof subSelection1 === 'object' && typeof subSelection2 === 'object') {
      destination[key] = [args1, mergeSelections(subSelection1, subSelection2)];
      return;
    }
    throw new Error(
      `Cannot merge selections of different types: ${JSON.stringify(args1)} and ${JSON.stringify(
        args2,
      )}`,
    );
  });
  return destination;
};

const resolveSpreads = (selection: any): any => {
  let selectionWithoutSpreads: any = Object.fromEntries(
    Object.entries(selection).filter(([k]) => !k.startsWith('...')),
  );
  const spreads: any[] = Object.entries(selection)
    .filter(([k]) => k.startsWith('...'))
    .map(([, v]) => v);
  spreads.map(resolveSpreads).forEach((s) => {
    selectionWithoutSpreads = mergeSelections(selectionWithoutSpreads, s);
  });
  return selectionWithoutSpreads;
};

const compileSelectionEntry = <TOutputObjectTypeEntry extends OutputObjectTypeEntry>(
  key: string,
  selectionEntry: SelectionEntry<TOutputObjectTypeEntry>,
  nameByVariable: Map<VariableReference<any>, string>,
  indentSize = 0,
): string => {
  const indent = ' '.repeat(indentSize);
  const [args, subSelection] = normalizeEntry(selectionEntry);
  const compiledfieldName = compileKey(key);
  const compiledArguments =
    Object.keys(args).length === 0
      ? ''
      : `(${Object.entries(args)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `${k}: ${compileArgument(v, nameByVariable)}`)
          .join(', ')})`;

  if (subSelection === SELECT) {
    return `${indent}${compiledfieldName}${compiledArguments}`;
  }
  return [
    `${indent}${compiledfieldName}${compiledArguments} {`,
    Object.entries(resolveSpreads(subSelection))
      .map(([k, v]) => compileSelectionEntry(k, v as any, nameByVariable, indentSize + 2))
      .join('\n'),
    `${indent}}`,
  ].join('\n');
};

const constructVariableReference = <
  TInputTypeNamespace extends InputTypeNamespace,
  TDefinition extends VariableReferenceDefinition<TInputTypeNamespace>,
>(
  definition: TDefinition,
): VariableReference<VariableReferenceType<TInputTypeNamespace, TDefinition>> => ({
  __definition: definition,
});

const constructVariableReferences = <
  TInputTypeNamespace extends InputTypeNamespace,
  TVariableDefinitions extends VariableDefinitions<TInputTypeNamespace>,
>(
  variables: TVariableDefinitions,
) => {
  const variableEntries = Object.entries(variables);
  const wrappedVariableEntries = variableEntries.map(
    ([k, v]) => [k, constructVariableReference<TInputTypeNamespace, typeof v>(v)] as const,
  );
  const nameByVariable = new Map(wrappedVariableEntries.map(([k, v]) => [v, k]));

  return {
    variableObjects: Object.fromEntries(wrappedVariableEntries) as VariableReferences<
      TInputTypeNamespace,
      TVariableDefinitions
    >,
    variableNameByVariableObject: nameByVariable,
  };
};

export const makeCompileSelection =
  <TInputTypeNamespace extends InputTypeNamespace, TOutputObjectType extends OutputObjectType>(
    type: 'query' | 'mutation' | 'subscription',
  ) =>
  <TVariables extends null | VariableDefinitions<TInputTypeNamespace>>(variables: TVariables) =>
  <TSelection extends Selection<TOutputObjectType>>(
    selection:
      | TSelection
      | ((v: VariableReferences<TInputTypeNamespace, NonNullable<TVariables>>) => TSelection),
  ): GraphQLString<
    Result<TSelection, TOutputObjectType>,
    VariableReferenceValues<TInputTypeNamespace, NonNullable<TVariables>>
  > => {
    const cleanedVariables = (variables || {}) as NonNullable<TVariables>;
    const { variableObjects, variableNameByVariableObject } = constructVariableReferences<
      TInputTypeNamespace,
      NonNullable<TVariables>
    >(cleanedVariables);
    const variableEntries = Object.entries(cleanedVariables);
    const compiledVariableDefinitions = variableEntries.map(([k, v]) => `$${k}: ${v}`).join(', ');
    const compiledVariablesWithParenth =
      compiledVariableDefinitions.length > 0 ? `(${compiledVariableDefinitions})` : '';
    const evaluatedSelection =
      typeof selection === 'function' ? selection(variableObjects) : selection;
    return compileSelectionEntry(
      `${type}${compiledVariablesWithParenth}`,
      [{}, evaluatedSelection],
      variableNameByVariableObject,
    );
  };

// ---------------------------------------------------------
// Functions for defining quries, mutations or subscriptions
// ---------------------------------------------------------

export const makeGraphql = <
  TObjectTypeNamespace extends ObjectTypeNamespace,
  TInputTypeNamespace extends InputTypeNamespace,
>() => {
  // Overload 1: selection without variables
  function fn<TTypeName extends keyof TObjectTypeNamespace>(
    type: TTypeName,
  ): <TSelection extends Selection<TObjectTypeNamespace[TTypeName]>>(
    selection: TSelection,
  ) => TSelection & HasOutputObjectType<TObjectTypeNamespace[TTypeName]>;

  // Overload 2: selection with variables
  function fn<
    TTypeName extends keyof TObjectTypeNamespace,
    TVariables extends VariableDefinitions<TInputTypeNamespace>,
  >(
    type: TTypeName,
    variables: TVariables,
  ): <
    TGetSelection extends (
      v: VariableReferences<TInputTypeNamespace, TVariables>,
    ) => Selection<TObjectTypeNamespace[TTypeName]>,
  >(
    getSselection: TGetSelection,
  ) => TGetSelection & HasOutputObjectType<TObjectTypeNamespace[TTypeName]>;

  // Actual implementation
  function fn() {
    return (selectionOrGetSelection: any) => selectionOrGetSelection;
  }
  return fn;
};

export const makeDefineVariables =
  <TInputTypeNamespace extends InputTypeNamespace>() =>
  <TVariables extends VariableDefinitions<TInputTypeNamespace>>(variables: TVariables) =>
    variables;
