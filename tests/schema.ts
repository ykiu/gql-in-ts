// This file is auto-generated with gql-in-ts

import {
  List,
  Nullable,
  Predicate,
  makeGraphql,
  makeCompileGraphQL,
  makeDefineVariables,
} from '../src';

type Int = Predicate<number>;
type Float = Predicate<number>;
type String = Predicate<string>;
type Boolean = Predicate<boolean>;
type ID = Predicate<string>;
type DateTime = Predicate<Date>;

export type Schema = {
  query: Query;
  mutation: Mutation;
}

export type Query = {
  __typename: {
    arguments: {};
    type: Predicate<"Query">;
  };
  user: {
    arguments: {};
    type: User;
  };
  posts: {
    arguments: {
      author: { type: Nullable<String> };
    };
    type: List<Post>;
  };
  feed: {
    arguments: {};
    type: List<FeedItem>;
  };
  "...": {
    arguments: {};
    type: Query;
  };
}

export type User = {
  __typename: {
    arguments: {};
    type: Predicate<"User">;
  };
  id: {
    arguments: {};
    type: Int;
  };
  username: {
    arguments: {};
    type: String;
  };
  nickname: {
    arguments: {};
    type: Nullable<String>;
  };
  avatar: {
    arguments: {
      width: { type: Nullable<Int> };
      height: { type: Nullable<Int> };
    };
    type: Nullable<String>;
  };
  "...": {
    arguments: {};
    type: User;
  };
}

export type FeedItem = {
  __typename: {
    arguments: {};
    type: Predicate<"Post" | "Comment">;
  };
  id: {
    arguments: {};
    type: Int;
  };
  author: {
    arguments: {};
    type: User;
  };
  "...": {
    arguments: {};
    type: FeedItem;
  };
  "... on Post": {
    arguments: {};
    type: Post;
  };
  "... on Comment": {
    arguments: {};
    type: Comment;
  };
}

export type PostStatus = Predicate<
  | "DRAFT"
  | "PUBLIC"
  | "ARCHIVED"
>

export type Post = {
  __typename: {
    arguments: {};
    type: Predicate<"Post">;
  };
  id: {
    arguments: {};
    type: Int;
  };
  author: {
    arguments: {};
    type: User;
  };
  title: {
    arguments: {};
    type: String;
  };
  content: {
    arguments: {
      maxLength: { type: Nullable<Int> };
    };
    type: String;
  };
  status: {
    arguments: {};
    type: PostStatus;
  };
  "...": {
    arguments: {};
    type: Post;
  };
}

export type Comment = {
  __typename: {
    arguments: {};
    type: Predicate<"Comment">;
  };
  id: {
    arguments: {};
    type: Int;
  };
  author: {
    arguments: {};
    type: User;
  };
  content: {
    arguments: {
      maxLength: { type: Nullable<Int> };
    };
    type: String;
  };
  post: {
    arguments: {};
    type: Post;
  };
  "...": {
    arguments: {};
    type: Comment;
  };
}

export type LoginInput = {
  username: { type: String };
  password: { type: String };
}

export type LoginPayload = {
  __typename: {
    arguments: {};
    type: Predicate<"LoginSuccess" | "LoginError">;
  };
  "...": {
    arguments: {};
    type: LoginPayload;
  };
  "... on LoginSuccess": {
    arguments: {};
    type: LoginSuccess;
  };
  "... on LoginError": {
    arguments: {};
    type: LoginError;
  };
}

export type LoginSuccess = {
  __typename: {
    arguments: {};
    type: Predicate<"LoginSuccess">;
  };
  token: {
    arguments: {};
    type: String;
  };
  user: {
    arguments: {};
    type: User;
  };
  "...": {
    arguments: {};
    type: LoginSuccess;
  };
}

export type LoginError = {
  __typename: {
    arguments: {};
    type: Predicate<"LoginError">;
  };
  message: {
    arguments: {};
    type: String;
  };
  "...": {
    arguments: {};
    type: LoginError;
  };
}

export type Mutation = {
  __typename: {
    arguments: {};
    type: Predicate<"Mutation">;
  };
  login: {
    arguments: {
      input: { type: LoginInput };
    };
    type: LoginPayload;
  };
  bulkMutatePosts: {
    arguments: {
      inputs: { type: List<MutatePostInput> };
    };
    type: List<Post>;
  };
  "...": {
    arguments: {};
    type: Mutation;
  };
}

export type MutatePostInput = {
  id: { type: Nullable<Int> };
  title: { type: String };
  content: { type: String };
}

export type StrayInterface = {
  __typename: {
    arguments: {};
    type: Predicate<never>;
  };
  foo: {
    arguments: {};
    type: Nullable<String>;
  };
  "...": {
    arguments: {};
    type: StrayInterface;
  };
}

export type __Schema = {
  __typename: {
    arguments: {};
    type: Predicate<"__Schema">;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  types: {
    arguments: {};
    type: List<__Type>;
  };
  queryType: {
    arguments: {};
    type: __Type;
  };
  mutationType: {
    arguments: {};
    type: Nullable<__Type>;
  };
  subscriptionType: {
    arguments: {};
    type: Nullable<__Type>;
  };
  directives: {
    arguments: {};
    type: List<__Directive>;
  };
  "...": {
    arguments: {};
    type: __Schema;
  };
}

export type __Type = {
  __typename: {
    arguments: {};
    type: Predicate<"__Type">;
  };
  kind: {
    arguments: {};
    type: __TypeKind;
  };
  name: {
    arguments: {};
    type: Nullable<String>;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  specifiedByUrl: {
    arguments: {};
    type: Nullable<String>;
  };
  fields: {
    arguments: {
      includeDeprecated: { type: Nullable<Boolean> };
    };
    type: Nullable<List<__Field>>;
  };
  interfaces: {
    arguments: {};
    type: Nullable<List<__Type>>;
  };
  possibleTypes: {
    arguments: {};
    type: Nullable<List<__Type>>;
  };
  enumValues: {
    arguments: {
      includeDeprecated: { type: Nullable<Boolean> };
    };
    type: Nullable<List<__EnumValue>>;
  };
  inputFields: {
    arguments: {
      includeDeprecated: { type: Nullable<Boolean> };
    };
    type: Nullable<List<__InputValue>>;
  };
  ofType: {
    arguments: {};
    type: Nullable<__Type>;
  };
  "...": {
    arguments: {};
    type: __Type;
  };
}

export type __TypeKind = Predicate<
  | "SCALAR"
  | "OBJECT"
  | "INTERFACE"
  | "UNION"
  | "ENUM"
  | "INPUT_OBJECT"
  | "LIST"
  | "NON_NULL"
>

export type __Field = {
  __typename: {
    arguments: {};
    type: Predicate<"__Field">;
  };
  name: {
    arguments: {};
    type: String;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  args: {
    arguments: {
      includeDeprecated: { type: Nullable<Boolean> };
    };
    type: List<__InputValue>;
  };
  type: {
    arguments: {};
    type: __Type;
  };
  isDeprecated: {
    arguments: {};
    type: Boolean;
  };
  deprecationReason: {
    arguments: {};
    type: Nullable<String>;
  };
  "...": {
    arguments: {};
    type: __Field;
  };
}

export type __InputValue = {
  __typename: {
    arguments: {};
    type: Predicate<"__InputValue">;
  };
  name: {
    arguments: {};
    type: String;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  type: {
    arguments: {};
    type: __Type;
  };
  defaultValue: {
    arguments: {};
    type: Nullable<String>;
  };
  isDeprecated: {
    arguments: {};
    type: Boolean;
  };
  deprecationReason: {
    arguments: {};
    type: Nullable<String>;
  };
  "...": {
    arguments: {};
    type: __InputValue;
  };
}

export type __EnumValue = {
  __typename: {
    arguments: {};
    type: Predicate<"__EnumValue">;
  };
  name: {
    arguments: {};
    type: String;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  isDeprecated: {
    arguments: {};
    type: Boolean;
  };
  deprecationReason: {
    arguments: {};
    type: Nullable<String>;
  };
  "...": {
    arguments: {};
    type: __EnumValue;
  };
}

export type __Directive = {
  __typename: {
    arguments: {};
    type: Predicate<"__Directive">;
  };
  name: {
    arguments: {};
    type: String;
  };
  description: {
    arguments: {};
    type: Nullable<String>;
  };
  isRepeatable: {
    arguments: {};
    type: Boolean;
  };
  locations: {
    arguments: {};
    type: List<__DirectiveLocation>;
  };
  args: {
    arguments: {
      includeDeprecated: { type: Nullable<Boolean> };
    };
    type: List<__InputValue>;
  };
  "...": {
    arguments: {};
    type: __Directive;
  };
}

export type __DirectiveLocation = Predicate<
  | "QUERY"
  | "MUTATION"
  | "SUBSCRIPTION"
  | "FIELD"
  | "FRAGMENT_DEFINITION"
  | "FRAGMENT_SPREAD"
  | "INLINE_FRAGMENT"
  | "VARIABLE_DEFINITION"
  | "SCHEMA"
  | "SCALAR"
  | "OBJECT"
  | "FIELD_DEFINITION"
  | "ARGUMENT_DEFINITION"
  | "INTERFACE"
  | "UNION"
  | "ENUM"
  | "ENUM_VALUE"
  | "INPUT_OBJECT"
  | "INPUT_FIELD_DEFINITION"
>

export type OutputCompositeTypeMap = {
  Query: Query;
  User: User;
  FeedItem: FeedItem;
  Post: Post;
  Comment: Comment;
  LoginPayload: LoginPayload;
  LoginSuccess: LoginSuccess;
  LoginError: LoginError;
  Mutation: Mutation;
  StrayInterface: StrayInterface;
  __Schema: __Schema;
  __Type: __Type;
  __Field: __Field;
  __InputValue: __InputValue;
  __EnumValue: __EnumValue;
  __Directive: __Directive;
};

export type InputTypeMap = {
  String: String;
  Int: Int;
  PostStatus: PostStatus;
  LoginInput: LoginInput;
  MutatePostInput: MutatePostInput;
  Boolean: Boolean;
  __TypeKind: __TypeKind;
  __DirectiveLocation: __DirectiveLocation;
};

export const graphql = makeGraphql<OutputCompositeTypeMap, InputTypeMap>();
export const compileGraphQL = makeCompileGraphQL<InputTypeMap, Schema>();
export type { Resolved, Selection, GraphQLString } from '../src';
export const defineVariables = makeDefineVariables<InputTypeMap>();
