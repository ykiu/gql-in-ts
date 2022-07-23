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
    arguments: { author: { type: Nullable<Predicate<string>> } };
    type: List<Post>;
  };
  '...': {
    arguments: {};
    type: Query;
  };
};
export type User = {
  id: {
    arguments: {};
    type: Predicate<number>;
  };
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
    arguments: { maxLength: { type: Nullable<Predicate<number>> } };
    type: Predicate<string>;
  };
  '...': {
    arguments: {};
    type: Post;
  };
};
export type LoginInput = {
  username: { type: Predicate<string> };
  password: { type: Predicate<string> };
};
export type LoginPayload = {
  token: {
    arguments: {};
    type: Predicate<string>;
  };
  user: {
    arguments: {};
    type: User;
  };
  '...': {
    arguments: {};
    type: LoginPayload;
  };
};
export type Mutation = {
  login: {
    arguments: { input: { type: LoginInput } };
    type: LoginPayload;
  };
  bulkMutatePosts: {
    arguments: { inputs: { type: List<MutatePostInput> } };
    type: List<Post>;
  };
  '...': {
    arguments: {};
    type: Mutation;
  };
};
export type MutatePostInput = {
  id: { type: Nullable<Predicate<number>> };
  title: { type: Predicate<string> };
  content: { type: Predicate<string> };
};
type ObjectTypeNamespace = {
  Query: Query;
  User: User;
  Post: Post;
  LoginPayload: LoginPayload;
  Mutation: Mutation;
};
export type InputTypeNamespace = {
  Int: Predicate<number>;
  Float: Predicate<number>;
  String: Predicate<string>;
  Boolean: Predicate<boolean>;
  ID: Predicate<string>;
  LoginInput: LoginInput;
  MutatePostInput: MutatePostInput;
};
export const graphql = makeGraphql<ObjectTypeNamespace, InputTypeNamespace>();
export const compileQuery = makeCompileSelection<InputTypeNamespace, Query>('query');
export const compileMutation = makeCompileSelection<InputTypeNamespace, Mutation>('mutation');
export const defineVariables = makeDefineVariables<InputTypeNamespace>();
