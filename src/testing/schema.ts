// This file is auto-generated with gql-in-ts

import {
  List,
  Nullable,
  Predicate,
  makeGraphql,
  makeCompileGraphQL,
  makeDefineVariables,
} from '../graphql';
export type Schema = { query: Query; mutation: Mutation };
export type Query = {
  user: {
    arguments: {};
    type: User;
  };
  posts: {
    arguments: { author: { type: Nullable<Predicate<string>> } };
    type: List<Post>;
  };
  feed: {
    arguments: {};
    type: List<FeedItem>;
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
  avatar: {
    arguments: {
      width: { type: Nullable<Predicate<number>> };
      height: { type: Nullable<Predicate<number>> };
    };
    type: Nullable<Predicate<string>>;
  };
  '...': {
    arguments: {};
    type: User;
  };
};
const PostStatusValues = ['DRAFT', 'PUBLIC', 'ARCHIVED'] as const;
type PostStatus = Predicate<typeof PostStatusValues extends readonly (infer T)[] ? T : never>;
export type Post = {
  id: {
    arguments: {};
    type: Predicate<number>;
  };
  author: {
    arguments: {};
    type: User;
  };
  title: {
    arguments: {};
    type: Predicate<string>;
  };
  content: {
    arguments: { maxLength: { type: Nullable<Predicate<number>> } };
    type: Predicate<string>;
  };
  status: {
    arguments: {};
    type: PostStatus;
  };
  comments: {
    arguments: {};
    type: List<Comment>;
  };
  '...': {
    arguments: {};
    type: Post;
  };
};
type Comment = {
  id: {
    arguments: {};
    type: Predicate<number>;
  };
  author: {
    arguments: {};
    type: User;
  };
  content: {
    arguments: { maxLength: { type: Nullable<Predicate<number>> } };
    type: Predicate<string>;
  };
  post: {
    arguments: {};
    type: Post;
  };
};
/** Interface FeedItem */
type FeedItem = {
  id: {
    arguments: {};
    type: Predicate<number>;
  };
  author: {
    arguments: {};
    type: User;
  };
  '... on Post': {
    arguments: {};
    type: Post;
  };
  '... on Comment': {
    arguments: {};
    type: Comment;
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
export const compileGraphQL = makeCompileGraphQL<InputTypeNamespace, Schema>();
export type { Result, Selection, GraphQLString } from '../graphql';
export const defineVariables = makeDefineVariables<InputTypeNamespace>();
