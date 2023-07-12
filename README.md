<a href="https://github.com/ykiu/gql-in-ts"><img src="./logo-dist.svg" style="width: 320px; max-width: 100%; aspect-ratio: 364.3 / 160" alt="gql-in-ts logo" /></a>

# gql-in-ts

[![npm](https://img.shields.io/npm/v/gql-in-ts)](https://www.npmjs.com/package/gql-in-ts/) ![](https://github.com/ykiu/gql-in-ts/actions/workflows/ci.yaml/badge.svg)

A type-safe way to write GraphQL. Express your query as a plain object. Keep your code safe with the power of TypeScript.

<img src="https://user-images.githubusercontent.com/32252655/188314291-69ecbd37-2f11-4445-b493-e57186b3eb90.gif" style="aspect-ratio: 1460 / 474" alt="A screen recording demonstrating what it looks like to write a query with gql-in-ts." />

## Features

**Straightforward** — Tired of maintaining a complex development environment with loads of plugins/extensions? `gql-in-ts` is a tiny library that comes with carefully-designed TypeScript type definitions. It requires no changes to your existing build process, yet it guarantees the correctness of your GraphQL queries with the help of the TypeScript compiler.

**Ergonomic** — Most existing GraphQL client solutions work by generating TypeScript code from GraphQL queries. `gql-in-ts`, in contrast, relies on TypeScript type inference to keep queries and types in sync, eliminating the need for code generation.

**Portable** — Being agnostic of the runtime or view framework, `gql-in-ts` will Just Work™ in any ES5+ environment.

## Getting started

`gql-in-ts` supports TypeScript 4.4 thru 4.9.

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

The generated module exports a function named `graphql`. Use it to write GraphQL operations:

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

The `graphql` function returns your query without doing any processing on it. However, its type signagures do enforce type checking, allowing TypeScript-compatible editors to provide instant feedback and auto-completion.

You can split up a large query into smaller pieces, much like you do with GraphQL fragments:

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

### The `Result` type

Use the `Result` type for typing the response for the query:

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

### The `compileGraphQL` function

As mentioned earlier, the `graphql` function returns the given query unmodified. As your query is a plain JavaScript object, you'll need to convert it to a real GraphQL query before sending it to the server. Do so by using `compileGraphQL`:

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

Think of `compileGraphQL` as a JSON.stringify() for GraphQL.

While `compileGraphQL` returns an ordinary string at runtime, its return type in TypeScript is a string subtype named `GraphQLString`. `GraphQLString`, in addition to all the string properties, has one useful property: the `Result` for the compiled query. You can extract the `Result` by using [the infer keyword in a conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types):

```ts
import { GraphQLString } from './schema';

type MyResult = typeof compiled extends GraphQLString<infer TResult, never> ? TResult : never;
```

You can also pass your query directly to `compileGraphQL` instead of via `graphql`.

```ts
import { compileGraphQL } from './schema';

const compiled = compileGraphQL('query')({
  user: userFragment,
  posts: [{ author: 'me' }, postFragment],
});
```

### Making a request

`gql-in-ts` is agnostic of the transport layer: it's your responsibility to send requests to your backend server. That said, most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), so here I include an example demonstrating how to send a typed GraphQL query using `fetch`:

```ts
import { GraphQLString } from './schema';

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

## Advanced

### Using aliases

You can alias a field by appending ` as [alias]` to the field name:

```ts
import { graphql } from './schema';

const postFragment = graphql('Post')({
  id: true,
  'content as longContent': [{ maxLength: 4000 }, true],
  'content as shortContent': [{ maxLength: 40 }, true],
});
```

You can access the fields on the resulting response by their respective aliases. Aliasing is possible thanks to [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) of TypeScript.

### Unions and interfaces

You can specify the type condition for a fragment by using keys with the pattern `... on [type name]`. Say `FeedItem` is an interface for things that appear in feeds, and `Post` and `Comment` implement `FeedItem`. `id` and `author` are defined in `FeedItem`, and additional fields are defined in the respective implementations:

```ts
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
```

Use `__typename` to switch by the type of the feedItem to benefit from TypeScript's type narrowing feature:

```ts
import { Result } from './schema';

const processFeedItem = (feedItem: Result<typeof feedFragment>) => {
  if (feedItem.__typename === 'Comment') {
    // The type of feedItem is inferred as Comment in this block.
  } else if (feedItem.__typename === 'Post') {
    // The type of feedItem is inferred as Post in this block.
  }
};
```

### Merging fragments

You can "merge" fragments. This is a powerful feature that allows to colocate fragments and the code that depends on them, maximizing maintainability of both the code and the query.

Suppose you want to render a post. You've split the rendering function into two parts where the first one is for the header of a post and the second one for the main text. The former is only interested in the post's `title` and `author`:

```ts
import { graphql, Result } from './schema';

const postHeaderFragment = graphql('Post')({
  title: true,
  author: {
    id: true,
    username: true,
    avatar: [{ width: 128, height: 128 }, true],
  },
});

const renderPostHeader = (post: Result<typeof postHeaderFragment>) => {
  // ...
};
```

...and the latter is only interested in the post's `content`:

```ts
import { graphql, Result } from './schema';

const postContentFragment = graphql('Post')({
  content: true,
});

const renderPostContent = (post: Result<typeof postContentFragment>) => {
  // ...
};
```

Now on to the parent that renders both of them. Say the parent needs `id` as its own requirement. It also needs the data the children need so that it can pass that data to `renderPostHeader()` and `renderPostContent()`. You can write a fragment for the parent by merging the fragments of the children. Do so by using a special key spelled `...`:

```ts
import { graphql, Result } from './schema';

const postFragment = graphql('Post')({
  id: true,
  '... as a': postHeaderFragment.
  '... as b': postContentFragment.
});

const renderPost = (post: Result<typeof postFragment>) => {
  const postHeader = renderPostHeader(post);
  const postContent = renderPostHeader(post);
  // ...
}
```

Note that two `...`s are given [aliases](#using-aliases) to avoid key collision. `...` is similar to the object spread syntax of JavaScript. However, by using `...` as a key, you are telling `gql-in-ts` to _recursively_ merge fragments, while the object spread syntax merges objects only _shallowly_.

This way, you can place GraphQL queries side-by-side with functions or classes that need data for the queries. The pattern is sometimes called colocation and is a good practice to keep your code DRY and maintainable.

_Caution: when you try to merge fragments with conflicting arguments, compileGraphQL will throw a runtime error. For example, the following is an error._

```ts
import { compileGraphQL } from './schema';

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

### Using variables

Variables allow to compile a query once and to reuse it over and over again with different parameters. Compiling is not that expensive so you could write arguments inline, as in [the first example](#the-graphql-function), but for performance freaks, variables provide a way to tune their code.

To define a fragment with variables, declare the names and the types of the variables, and pass a callback to `graphql`. You can reference the variables from within the callback:

```ts
import { graphql } from './schema';

const userFragment = graphql('User', { avatarSize: 'Int!' })(($) => ({
  avatar: [{ width: $.avatarSize, height: $.avatarSize }, true],
}));
```

The `graphql` function always returns the last argument as is. In this case, the last argument is a function. You can call it in other queries or fragments to pass variables down:

```ts
import { graphql } from './schema';

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
import { compileGraphQL } from './schema';

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

The syntax of variable definitions follows that of real GraphQL (e.g. types are optional by default, and types with "!" are required). Variable definitions are type-checked using [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html).

You can extract the types of the variables that a compiled query takes by using the second type parameter of `GraphQLString`:

```ts
import { GraphQLString } from './schema';

type MyVariables = typeof compiled extends GraphQLString<infer TResult, TVariables>
  ? TVariables
  : never;
```

## Limitations

At the moment `gql-in-ts` has the following limitations:

- Not capable of eliminating extraneous fields.
  - As it is hard to prevent objects from having extra properties in TypeScript, you won't get a type error even if you include a non-existent field in your query. Since GraphQL execution engines error when they meet an unknown field, this introduces an unsafeness where the code passes type check but errors at runtime.

## Related works

Several other solutions employ an approach similar to this library. This one especially owes a lot to [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) for the idea of using TypeScript type transformations to precisely type GraphQL response data. If you are interested in this project you may want to take a look at them as well.
