# gql-in-ts

[![npm](https://img.shields.io/npm/v/gql-in-ts)](https://www.npmjs.com/package/gql-in-ts/) ![](https://github.com/ykiu/gql-in-ts/actions/workflows/ci.yaml/badge.svg)

A type-safe way to write GraphQL. Express queries as plain JavaScript objects and get types inferred by TypeScript.

<img src="https://user-images.githubusercontent.com/32252655/188314291-69ecbd37-2f11-4445-b493-e57186b3eb90.gif" style="aspect-ratio: 1460 / 474" alt="A screen recording demonstrating how to write a query as a plain JavaScript object." />

## Features

### Minimum setup

**Start using GraphQL without bothering with setting up development environment**. With `gql-in-ts`, queries are 100% pure TypeScript. If your editor understands TypeScript, you'll get realtime type checking and autocompletion for `gql-in-ts` queries without any plugins.

### Seamless development experience

**Update queries without running code generation**. Changes in queries automatically cascade to the relevant types.

### Framework agnostic

**Use with the tooling of your choice**. The sole mission of `gql-in-ts` at runtime is to transform JavaScript objects to GraphQL query strings (similar to `JSON.stringify()`). `gql-in-ts` is thin by design. It does not even depend on browser APIs and runs in any JavaScript environment.

## Motivation

Arguably the most widely adopted technique of using GraphQL in TypeScript would be to use code generation to obtain TypeScript types for the response data for GraphQL queries. This approach, while it works, comes with some pain points, like:

- You'll have to run code generation every time you change queries.
- By default you'll get poor support from the text editor while editing GraphQL. You have to setup a plugin for GraphQL to enable features like syntax highlighting or auto-completion.

`gql-in-ts` bypasses these problems in a simple way: express queries as plain JavaScript objects.

With `gql-in-ts`, you run code generation _only when the schema changes_. Since schemas tend to change less often than queries, you'll need to run code generation less frequently than in the case of the conventional aproach.

In `gql-in-ts`, your queries are plain TypeScript code. You'll get support from your text editor without extra plugins.

## Getting started

Currently TypeScript 4.4 thru 4.8 is supported.

Install the library:

```bash
npm i gql-in-ts
```

Generate TypeScript code from your schema:

```bash
npx gql-in-ts schema.graphql schema.ts
```

Now you are all set!

## Core concepts

### The `graphql` function

The generated module exports a function named `graphql`, which helps to write typed GraphQL queries.

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

The `graphql` function, at runtime, returns the last argument unmodified. In fact, its definition without the types looks as simple as:

```ts
const graphql = () => (arg) => arg;
```

The true value of `graphql` lies in its type definition. By wrapping your query with `graphql`, you'll get suppport from TypeScript like completion and type checking.

You can split up a large query into smaller pieces, much like you do with GraphQL fragments:

```ts
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

### The `Result` type

Now, how would you know the shape of the response that would be returned for the query you wrote? Use the `Result` type:

```ts
import { Result } from './schema';

type QueryResult = Result<typeof query>;
// QueryResult would be inferred as:
// {
//   user: {
//     username: string;
//     nickname: string;
//   };
//   posts: {
//     title: string;
//     content: string;
//   }[];
// }
```

**`Result` is the heart and soul of `gql-in-ts`.** It does all the heavy lifting of mapping the shape of the query to the shape of the data that would be returned from the GraphQL server. `Result` does this by relying on the TypeScript ability to do complex computations such as [mapping object properties](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) and [making conditions](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) as part of type checking.

### The `compileGraphQL` function

Compile the query into string by using `compileGraphQL`:

```ts
import { compileGraphQL } from './schema';

const compiled = compileGraphQL('query')(query);
expect(compiled).toEqual(
  `query {
  user {
    username
    nickname
  }
  posts(author: "me") {
    title
    content
  }
}`,
);
```

Think of `compileGraphQL` as a JSON.stringify() for GraphQL. It transforms a plain JavaScript object that looks like a GraphQL into an actual GraphQL string.

While at runtime `compileGraphQL` returns an ordinary string, at the TypeScript level its return type is a special string subtype named `GraphQLString`. `GraphQLString`, in addition to all the string properties, has one useful property: the `Result` for the compiled query. You can extract the `Result` by using [the infer keyword in a conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types):

```ts
type MyResult = typeof compiled extends GraphQLString<infer TResult, never> ? TResult : never;
```

You can also pass your query directly to `compileGraphQL` instead of using `graphql`.

```ts
import { compileGraphQL } from './schema';

const compiled = compileGraphQL('query')({
  user: userFragment,
  posts: [{ author: 'me' }, postFragment],
});
```

### Making a request

`gql-in-ts` is agnostic of the transport layer: it's your responsibility to send requests to your backend server. That said, most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), so let me include an example demonstrating how to send a typed GraphQL query using `fetch`:

```ts
const makeGraphQLRequest = async <TResult>(
  compiled: GraphQLString<TResult, never>,
): Promise<TResult> => {
  const response = await fetch('http://example.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: compiled }),
    headers: {
      'content-type': 'application/json',
      // If your endpoint requires authorization, comment out the code below.
      // authorization: '...'
    },
  });
  const responseData = (await response.json()).data;
  return responseData;
};
```

## Using aliases

`gql-in-ts` supports aliases via special keys with the pattern "\[original name\] as \[alias\]":

```ts
const postFragment = graphql('Post')({
  id: true,
  'content as longContent': [{ maxLength: 4000 }, true],
  'content as shortContent': [{ maxLength: 40 }, true],
});
```

An alias won't compromise the level of type safety because it relies on [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html).

## Merging fragments

Sometimes you may want to "merge" a fragment onto a larger query or fragment. This can be done in GraphQL using fragment spread:

```graphql
fragment postDetailFragment on Post {
  id
  content
  author {
    id
    username
    avatar(width: 128, height: 128)
  }
}

query postsQuery {
  posts {
    ...postDetailFragment
    author {
      nickname
    }
  }
}
```

You can do the equivalent in `gql-in-ts` by using using a special key spelled "...":

```ts
const postDetailFragment = graphql('Post')({
  id: true,
  content: true,
  author: {
    id: true,
    username: true,
    avatar: [{ width: 128, height: 128 }, true],
  },
});
const query = graphql('Query')({
  posts: {
    '...': postDetailFragment,
    author: { nickname: true },
  },
});
```

To merge in more than one fragments, give "..." an arbitrary alias to avoid defining multiple properties with the same name:

```ts
const postDetailFragment = graphql('Post')({
  id: true,
  content: true,
  author: {
    id: true,
    username: true,
    avatar: [{ width: 128, height: 128 }, true],
  },
});
const postSummaryFragment = graphql('Post')({
  id: true,
  'content as shortContent': [{ maxLength: 40 }, true],
  author: {
    nickname: true,
    'avatar as smallAvatar': [{ width: 32, height: 32 }, true],
  },
});
const query = graphql('Query')({
  posts: {
    '... as a': postDetailFragment,
    '... as b': postSummaryFragment,
  },
});
const compiled = compileGraphQL('query')(query);
expect(compiled).toEqual(
  `query {
  posts {
    id
    content
    author {
      nickname
      smallAvatar: avatar(width: 32, height: 32)
      id
      username
      avatar(width: 128, height: 128)
    }
    shortContent: content(maxLength: 40)
  }
}`,
);
```

_Caution: when you try to merge fragments with conflicting arguments, compileGraphQL will throw an Error. For example, the following is an error._

```ts
compileGraphQL('query')({
  '... as a': {
    posts: { content: [{ maxLength: 100 }, true] },
  },
  '... as b': {
    posts: { content: [{ maxLength: 200 }, true] },
  },
});
// Error: Cannot merge fragments. Saw conflicting arguments...
```

## Using variables

`gql-in-ts` supports GraphQL variables. Variables allow to compile a query once and to reuse it over and over again with different parameters, minimizing the overhead of compiling.

To define a fragment with variables, declare the names and the types of the variables and pass a callback to `graphql`. You can reference the variables from within the callback:

```ts
const userFragment = graphql('User', { avatarSize: 'Int!' })(($) => ({
  avatar: [{ width: $.avatarSize, height: $.avatarSize }, true],
}));
```

As in the first example, `graphql` returns the last argument unmodified. In this case, the last argument is a function. Call it in other queries or fragments:

```ts
const postFragment = graphql('Post', { avatarSize: 'Int!' })(($) => ({
  id: true,
  author: {
    id: true,
    '...': userFragment({ avatarSize: $.avatarSize }),
  },
}));
```

Likewise, pass the definitions of variables and a callback to `compileGraphQL` to compile a query with variables:

```ts
const compiled = compileGraphQL('query', { avatarSize: 'Int!' })(($) => ({
  posts: postFragment({ avatarSize: $.avatarSize }),
}));
expect(compiled).toEqual(
  `query($avatarSize: Int!) {
  posts {
    id
    author {
      id
      avatar(width: $avatarSize, height: $avatarSize)
    }
  }
}`,
);
```

The syntax of variable definitions follows the syntax of variable definitions of real GraphQL (e.g. types are optional by default, types with "!" are required). Variable definitions are type checked using [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html).

## Limitations

At the moment `gql-in-ts` has the following limitations:

- Not capable of eliminating extraneous fields.
  - As it is hard to prevent objects from having extra properties in TypeScript, you won't get a type error even if you include a non-existent field in your query. Since GraphQL execution engines error when they meet an unknown field, this introduces an unsafeness where the code passes type check but errors at runtime.
- No support for unions and interfaces, at the moment.

## Related works

There are several other solutions that employ a similar approach. [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) are especially similar to this library in how they use TypeScript to precisely type GraphQL response data. If you are interested in this project you should definitely check them as well.
