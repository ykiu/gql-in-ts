// This file is auto-generated with compileGraphqlSchema.ts.

import {
  List,
  Nullable,
  Predicate,
  makeGraphql,
  makeCompileSelection,
  makeDefineVariables,
} from '../graphql';
export type Query = {
  user: {
    arguments: {};
    type: User;
  };
  posts: {
    arguments: {
      id_Gt: { type: Nullable<Predicate<number>> };
      author: { type: Nullable<Predicate<string>> };
    };
    type: List<Post>;
  };
  '...': {
    arguments: {};
    type: Query;
  };
};
export type User = {
  username: {
    arguments: {};
    type: Predicate<string>;
  };
  nickname: {
    arguments: {};
    type: Nullable<Predicate<string>>;
  };
  '...': {
    arguments: {};
    type: User;
  };
};
export type Post = {
  id: {
    arguments: {};
    type: Predicate<number>;
  };
  title: {
    arguments: {};
    type: Predicate<string>;
  };
  content: {
    arguments: { length: { type: Nullable<Predicate<number>> } };
    type: Predicate<string>;
  };
  '...': {
    arguments: {};
    type: Post;
  };
};
export type Mutation = {
  post: {
    arguments: { input: { type: PostMutationInput } };
    type: Post;
  };
  '...': {
    arguments: {};
    type: Mutation;
  };
};
export type PostMutationInput = {
  id: { type: Nullable<Predicate<number>> };
  title: { type: Predicate<string> };
  content: { type: Predicate<string> };
};
type ObjectTypeNamespace = {
  Query: Query;
  User: User;
  Post: Post;
  Mutation: Mutation;
};
export type InputTypeNamespace = {
  Int: Predicate<number>;
  Float: Predicate<number>;
  String: Predicate<string>;
  Boolean: Predicate<boolean>;
  ID: Predicate<string>;
  PostMutationInput: PostMutationInput;
};
export const graphql = makeGraphql<ObjectTypeNamespace, InputTypeNamespace>();
export const compileQuery = makeCompileSelection<InputTypeNamespace, Query>('query');
export const compileMutation = makeCompileSelection<InputTypeNamespace, Mutation>('mutation');
export const defineVariables = makeDefineVariables<InputTypeNamespace>();
