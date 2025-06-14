# gql-in-ts

[![npm](https://img.shields.io/npm/v/gql-in-ts)](https://www.npmjs.com/package/gql-in-ts/) ![](https://github.com/ykiu/gql-in-ts/actions/workflows/ci.yaml/badge.svg)

A lightweight and type-safe GraphQL query builder.

https://github.com/user-attachments/assets/696a82e4-dfa6-4843-ac6b-8126125e61ae

## Features

**Straightforward** — `gql-in-ts` allows you to inline GraphQL queries directly in TypeScript without requiring a special build process. It ensures query correctness using TypeScript’s type system.

**Ergonomic** — Unlike most GraphQL clients, gql-in-ts uses the TypeScript compiler to infer types directly from GraphQL queries, removing the need for code generation.

**Portable** — Being agnostic of the runtime or view framework, `gql-in-ts` will Just Work™ in any ES5+ environment.

## Supported TypeScript versions

Supports TypeScript versions 4.4 to 5.8 and [TypeScript 7](https://github.com/microsoft/typescript-go).

## Installing

```bash
npm i gql-in-ts
```

## Usage

### CLI

First, generate a TypeScript module from your GraphQL schema by running the `gql-in-ts` command. In the example below, `schema.graphql` is translated into `schema.ts`:

```bash
npx gql-in-ts schema.graphql schema.ts
```

### APIs

The generated module exports a function named `graphql`, which you'll use to define inline GraphQL queries:

```ts
import {
  graphql // A wrapper function for defining inline GraphQL queries.
} from './schema.ts'; // The generated module
```

Additionally, the module `gql-in-ts` exports helper types for deriving TypeScript types from GraphQL queries:

```ts
import {
  Output, // A helper type for getting the TypeScript type from a GraphQL operation.
  Input, // A helper type for getting the types of the variables (or parameters) that a GraphQL operation takes.
} from 'gql-in-ts';
```

#### The `graphql` function

The `graphql` function can be used to define a GraphQL operation:

```ts
import { graphql } from './schema';

const query = graphql('Query')({
  user: {
    username: true,
    nickname: true,
  },
  posts: [
    { author: 'me' },
    {
      title: true,
      content: true,
    },
  ],
});
```

The `graphql` function provides auto-completion for field names and arguments.

To divide a GraphQL operation into fragments, simply extract the parts of your interest and wrap the individual parts with the `graphql` function:

```ts
import { graphql } from './schema';

const userFragment = graphql('User')({
  username: true,
  nickname: true,
});
const postFragment = graphql('Post')({
  title: true,
  content: true,
});
const query = graphql('Query')({
  user: userFragment,
  posts: [{ author: 'me' }, postFragment],
});
```

The value returned from the `graphql` function is compiled into real GraphQL when `JSON.stringify`ed:

```ts
JSON.stringify({ query });
// '{"query":"query {\\n  user {\\n    username\\n    nickname\\n  }\\n  posts(author: \\"me\\") {\\n    title\\n    content\\n  }\\n}"}'
```

#### The `Output` type

The `Output` type can be used to define the response data type of a query:

```ts
import { Output } from 'gql-in-ts';

type QueryResult = Output<typeof query>;
```

`QueryResult` is inferred as:

```ts
type QueryResult = {
  user: {
    username: string;
    nickname: string | null;
  };
  posts: {
    title: string;
    content: string;
  }[];
};
```

#### The `Input` type

The `Input` type can be used to define input variable types of a query. I'll dwell on this later in the [Variables in queries](#variables-in-queries) section.

### Making a network request

`gql-in-ts` is network-agnostic. You can define a custom function to fetch a GraphQL endpoint and properly type the response, like this:

```ts
import { Output } from 'gql-in-ts';

const fetchGraphQL = async <T>(query: T) => {
  const response = await fetch('http://example.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query }),
    // query gets compiled into real GraphQL when JSON.stringify()ed.
    headers: {
      'content-type': 'application/json',
      // If your endpoint requires authorization, uncomment the code below.
      // authorization: '...'
    },
  });
  const responseData = (await response.json()).data;
  return responseData as Output<T>;
};

// Can be used like the following:
fetchGraphQL(query).then((data) => {
  const titles = data.posts.map((post) => post.title);
  // ...
});
```

_See also: [GraphQL: serving over HTTP](https://graphql.org/learn/serving-over-http/)._

### Syntax

This section describes the syntax of inline GraphQL queries that the `graphql` function accepts. The following schema is used for the purpose of explanation.

```graphql
schema {
  query: Query
  mutation: Mutation
}

type Query {
  user: User!
  posts(author: String): [Post!]!
  feed: [FeedItem!]!
}

type User {
  id: Int!
  username: String!
  nickname: String
  avatar(size: Int): String
}

interface FeedItem {
  id: Int!
  author: User!
}

enum PostStatus {
  DRAFT
  PUBLIC
  ARCHIVED
}

type Post implements FeedItem {
  id: Int!
  author: User!
  title: String!
  content(maxLength: Int): String!
  status: PostStatus!
}
```

#### Field selections

To select a primitive field, use `fieldname: true`.

To select a non-primitive field, use `fieldname: {...subselection}`.

In the example below,

```ts
import { graphql } from './schema';
const query = graphql('Query')({
  user: {
    username: true,
    nickname: true,
  },
});
```

The fields `username` and `nickname` are primitive fields on the `User` type, so they are selected as `fieldname: true`. The field `user` is a non-primitive field on the `Query` type, so it is selected as `fieldname: {...subselection}`.

#### Field selections with inputs

If a primitive field requires inputs, use `fieldname: [{inputname1: inputvalue1, inputname2: inputvalue2, ...}, true]`.

If a non-primitive field requires inputs, use `fieldname: [{inputname1: inputvalue1, inputname2: inputvalue2, ...}, { ...subselection }]`.

In the example below,

```ts
import { graphql } from './schema';
const query = graphql('Query')({
  user: {
    username: true,
    nickname: true,
    avatar: [{ size: 128 }, true],
  },
  posts: [
    { author: 'me' },
    {
      title: true,
      content: true,
    },
  ],
});
```

The `avatar` field on the `User` type is getting `{ size: 128 }` as an input. The `posts` field on the `Query` type is getting `{ author: 'me' }` as an input.

#### Field selections with aliases

If an object key is suffixed with ` as [alias]`, the field is aliased as `[alias]`. In the example below,

```ts
import { graphql } from './schema';
import { Output } from 'gql-in-ts';
const query = graphql('Query')({
  user: {
    username: true,
    nickname: true,
    'avatar as avatarSmall': [{ size: 128 }, true],
    'avatar as avatarLarge': [{ size: 512 }, true],
  },
});

type QueryOutput = Output<typeof query>;
```

`QueryOutput` is evaluated as follows:

```ts
type QueryOutput = {
  user: {
    username: string;
    nickname: string | null;
    avatarSmall: string | null;
    avatarLarge: string | null;
  };
};
```

#### Fragments

Use `...` to merge a GraphQL fragment. In the example below,

```ts
import { Output } from 'gql-in-ts';
import { graphql } from './schema';
const postHeaderFragment = graphql('Post')({
  title: true,
  author: {
    id: true,
    username: true,
    avatar: [{ size: 128 }, true],
  },
});

const postFragment = graphql('Post')({
  id: true,
  '...': postHeaderFragment,
});

type PostFragmentOutput = Output<typeof postFragment>;
```

`PostFragmentOutput` is evaluated as follows:

```ts
type PostFragmentOutput = {
  // id is selected in postFragment:
  id: number;

  // the rest of the fields are selected in postHeaderFragment:
  title: string;
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
};
```

To merge multiple fragments, use `... as [arbitrary alias]` instead of `...`. In the example below,

```ts
import { Output } from 'gql-in-ts';
import { graphql } from './schema';
const postContentFragment = graphql('Post')({
  content: true,
});

const postFragment = graphql('Post')({
  id: true,
  '... as a': postHeaderFragment,
  '... as b': postContentFragment,
});

type PostFragmentOutput = Output<typeof postFragment>;
```

`PostFragmentOutput` is evaluated as follows:

```ts
type PostFragmentOutput = {
  id: number;
  title: string;
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
  content: string;
};
```

_Caution: when multiple fragments with conflicting arguments are spread into the same location, a runtime error will be thrown. For example, the following is an error._

```ts
import { graphql } from './schema';
const query = graphql('Query')({
  '... as a': {
    posts: { content: [{ maxLength: 100 }, true] },
  },
  '... as b': {
    posts: { content: [{ maxLength: 200 }, true] },
  },
});

JSON.stringify({ query });
// Error: Cannot merge fragments. Saw conflicting arguments...
```

#### Unions and interfaces

To select fields on a union or an interface, a key named `... on [name of the union or the interface]` should be used. In the example below,

```ts
import { Output } from 'gql-in-ts';
import { graphql } from './schema';
const feedFragment = graphql('FeedItem')({
  __typename: true,
  id: true,
  author: { username: true },
  '... on Comment': {
    content: true,
    post: { title: true },
  },
  '... on Post': {
    title: true,
    content: true,
  },
});

type FeedFragmentOutput = Output<typeof feedFragment>;
```

`FeedFragmentOutput` is evaluated as follows:

```ts
type FeedFragmentOutput =
  | {
      title: string;
      content: string;
      __typename: 'Post';
      id: number;
      author: {
        username: string;
      };
    }
  | {
      content: string;
      post: {
        title: string;
      };
      __typename: 'Comment';
      id: number;
      author: {
        username: string;
      };
    };
```

`__typename` should be used to switch based on the actual type, as shown below:

```ts
let feedItem: FeedFragmentOutput;

if (feedItem.__typename === 'Comment') {
  // TypeScript figures out feedItem is a Comment in this block, and ...
} else if (feedItem.__typename === 'Post') {
  // feedItem is a Post in this block.
}
```

#### Variables in queries

Inputs to fields can be parameterized. In the example below,

```ts
import { graphql } from './schema';
import { Input } from 'gql-in-ts';
const query = graphql('Query', { postsAuthor: 'String!' })(($) => ({
  posts: [
    { author: $.postsAuthor },
    {
      title: true,
      content: true,
    },
  ],
}));
```

The input `author` of the `posts` field is parameterized as `postsAuthor`. Parameters are also called variables. The `query` query takes a variable named `postsAuthor`.

Note `{ postsAuthor: 'String!' }` in the definition of the `query` query. Variables should be defined in the same syntax as in real GraphQL.

The TypeScript type of the variables can be obtained through the `Input` type. In the example below,

```ts
type QueryInput = Input<typeof query>;
```

`{ postsAuthor: string }` is assignable to `QueryInput`.

When a query with variables is executed, the actual values for the variables have to be supplied. The `fetchGraphQL` function presented earlier can be improved to take variables into account:

```ts
import { graphql } from './schema';
import { Output, Input } from 'gql-in-ts';
const fetchGraphQL = async <T>(query: T, variables: Input<T>) => {
  const response = await fetch('http://example.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
    headers: {
      'content-type': 'application/json',
      // If your endpoint requires authorization, uncomment the code below.
      // authorization: '...'
    },
  });
  const responseData = (await response.json()).data;
  return responseData as Output<T>;
};
```

#### Variables in fragments

When using a parameterized fragment in another fragment or query, invoke the fragment as a function. In the example below,

```ts
import { graphql } from './schema';
const userFragment = graphql('User', { avatarSize: 'Int!' })(($) => ({
  avatar: [{ size: $.avatarSize }, true],
}));

const query = graphql('Query', { postsAuthor: 'String!' })(($) => ({
  posts: [
    { author: $.postsAuthor },
    {
      title: true,
      content: true,
      author: userFragment({ avatarSize: 128 }),
    },
  ],
}));
```

`userFragment` is getting the variable value `{ avatarSize: 128 }`.

A variable can also be specified using another variable instead of a literal. In the example below,

```ts
import { graphql } from './schema';
const query = graphql('Query', { postsAuthor: 'String!', postsAuthorAvatarSize: 'Int!' })(($) => ({
  posts: [
    { author: $.postsAuthor },
    {
      title: true,
      content: true,
      author: userFragment({ avatarSize: $.postsAuthorAvatarSize }),
    },
  ],
}));
```

the `query` query has gotten another variable named `postsAuthorAvatarSize`. It then passes that variable as an argument to `userFragment`.

## Limitations

Currently `gql-in-ts` does not warn about non-existent fields. As it is hard to prevent objects from having extra properties in TypeScript, you won't get a type error even if you include a non-existent field in your query. Because GraphQL execution engines reject unknown fields, a type mismatch could cause runtime errors despite passing TypeScript checks.

## Related works

This project is particularly indebted to [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) for their idea of using TypeScript type transformations to precisely type GraphQL response data. If you are interested in this project, you may want to take a look at them as well.
