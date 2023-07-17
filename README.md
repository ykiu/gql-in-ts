<a href="https://github.com/ykiu/gql-in-ts"><img src="./logo-dist.svg" style="width: 320px; max-width: 100%; aspect-ratio: 364.3 / 160" alt="gql-in-ts logo" /></a>

# gql-in-ts

[![npm](https://img.shields.io/npm/v/gql-in-ts)](https://www.npmjs.com/package/gql-in-ts/) ![](https://github.com/ykiu/gql-in-ts/actions/workflows/ci.yaml/badge.svg)

A type-safe way to write GraphQL. Express your queries as plain objects and rely on the TypeScript compiler to keep your type definitions in sync with the queries.

<img src="https://user-images.githubusercontent.com/32252655/253862101-906a209f-5bfa-4e72-af25-fa0967ffc79c.gif" style="aspect-ratio: 850 / 359" alt="A screen recording demonstrating the usage of gql-in-ts." />

## Features

**Straightforward** — Tired of maintaining a complex development environment with loads of plugins/extensions? `gql-in-ts` is a tiny library that comes with carefully designed TypeScript type definitions. It requires no changes to your existing build process, yet it guarantees the correctness of your GraphQL queries with the help of the TypeScript compiler.

**Ergonomic** — Unlike most existing GraphQL client solutions that generate TypeScript code from GraphQL queries, `gql-in-ts` relies on TypeScript type inference to keep queries and types in sync, eliminating the need for code generation.

**Portable** — Being agnostic of the runtime or view framework, `gql-in-ts` will Just Work™ in any ES5+ environment.

## Getting started

Currently, `gql-in-ts` is tested against TypeScript versions 4.4 through 5.1.

Install the library:

```bash
npm i gql-in-ts
```

Generate TypeScript code from your schema:

```bash
npx gql-in-ts schema.graphql schema.ts
```

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

The `graphql` function returns the query object as is, without modifying it. However, its type signatures enforce type checking, allowing TypeScript-compatible editors to provide instant feedback and auto-completion.

A large query can be split into smaller pieces, similar to breaking down a function or a class into smaller functions or classes:

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

### The `Resolved` utility type

The `Resolved` utility type can be used to define the response type of a query:

```ts
import { Resolved } from './schema';

type QueryResult = Resolved<typeof query>;
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

As mentioned earlier, the `graphql` function returns the given query unmodified. Because the query is a plain JavaScript object at this point, it needs to be converted to a GraphQL string before being sent to the server. This can be achieved by using `compileGraphQL`:

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

`compileGraphQL` is like `JSON.stringify()` for GraphQL. However, the return type of `compileGraphQL` is a string subtype named `GraphQLString`. `GraphQLString` is an ordinary string at runtime, but at the TypeScript level, it contains metadata for type inference. The `Resolved` utility can be used again to obtain the the type of the response:

```ts
type MyResult = Resolved<typeof compiled>;
```

Alternatively, the resolved type can be extracted from the first type parameter of GraphQLString:

```ts
import { GraphQLString } from './schema';

type MyResult = typeof compiled extends GraphQLString<infer TResolved> ? TResolved : never;
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

`gql-in-ts` is agnostic of the transport layer, so it is your responsibility to send requests to your backend server. However, since most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), here is an example demonstrating how to send a typed GraphQL query using `fetch`:

```ts
import { GraphQLString } from './schema';

const makeGraphQLRequest = async <TResolved>(
  compiled: GraphQLString<TResolved>,
): Promise<TResolved> => {
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

Fields can be aliased by appending ` as [alias]` to their names:

```ts
import { graphql } from './schema';

const postFragment = graphql('Post')({
  id: true,
  'content as longContent': [{ maxLength: 4000 }, true],
  'content as shortContent': [{ maxLength: 40 }, true],
});
```

The fields on the resulting response can be accessed by their respective aliases.

### Unions and interfaces

Fields on unions and interfaces can be queried by using keys with the pattern `... on [type name]`. Say `FeedItem` is an interface for things that appear in feeds, and `Post` and `Comment` implement `FeedItem`. `id` and `author` are defined in `FeedItem`, and additional fields are defined in the respective implementations:

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

On the response, `__typename` can be used to narrow down the type:

```ts
import { Resolved } from './schema';

const processFeedItem = (feedItem: Resolved<typeof feedFragment>) => {
  if (feedItem.__typename === 'Comment') {
    // The type of feedItem is inferred as Comment in this block.
  } else if (feedItem.__typename === 'Post') {
    // The type of feedItem is inferred as Post in this block.
  }
};
```

### Merging fragments

Fragments can be merged to form a larger fragment or a query. This comes in handy when you have small UI components that comprise a complex UI, where each component depends on different subsets of data from the GraphQL API. In such cases, it makes sense to use GraphQL fragments not just for fetching data, but also for describing the shape of inputs to the components.

Suppose you want to render a post. You've split the rendering function into two parts where the first one is for the header of a post and the second one for the main text. The former is only interested in the post's `title` and `author`:

```ts
import { graphql, Resolved } from './schema';

const postHeaderFragment = graphql('Post')({
  title: true,
  author: {
    id: true,
    username: true,
    avatar: [{ width: 128, height: 128 }, true],
  },
});

const renderPostHeader = (post: Resolved<typeof postHeaderFragment>) => {
  // ...
};
```

...and the latter is only interested in the post's `content`:

```ts
import { graphql, Resolved } from './schema';

const postContentFragment = graphql('Post')({
  content: true,
});

const renderPostContent = (post: Resolved<typeof postContentFragment>) => {
  // ...
};
```

Now on to the parent that renders both of them. Say the parent needs `id` as its own requirement. It also needs the data the children need so that it can pass that data to `renderPostHeader()` and `renderPostContent()`. You can write a fragment for the parent by merging the fragments of the children. Do so by using a special key spelled `...`:

```ts
import { graphql, Resolved } from './schema';

const postFragment = graphql('Post')({
  id: true,
  '... as a': postHeaderFragment.
  '... as b': postContentFragment.
});

const renderPost = (post: Resolved<typeof postFragment>) => {
  const postHeader = renderPostHeader(post);
  const postContent = renderPostHeader(post);
  // ...
}
```

Note that two `...`s are given [aliases](#using-aliases) to avoid key collision. `...` is similar to the object spread syntax of JavaScript. However, by using `...` as a key, you are telling `gql-in-ts` to _recursively_ merge fragments, while the object spread syntax merges objects only _shallowly_.

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

Variables allow queries to be compiled once and to be reused with different parameters. Compiling is not expensive so you could write arguments inline, as in [the first example](#the-graphql-function), but a performance freak can tune their code by using variables.

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

The types of the variables that a compiled query takes can be extracted from the second type parameter of `GraphQLString`. Therefore, the `makeGraphQLRequest` function from the earlier section can be rewritten to take variables into account:

```ts
import { GraphQLString } from './schema';

const makeGraphQLRequest = async <TResolved, TVariables>(
  compiled: GraphQLString<TResolved, TVariables>,
  variables: TVariables,
): Promise<TResolved> => {
  const response = await fetch('http://example.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: compiled, variables }),
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

## Limitations

At the moment `gql-in-ts` has the following limitations:

- It cannot eliminate extraneous fields.
  - As it is hard to prevent objects from having extra properties in TypeScript, you won't get a type error even if you include a non-existent field in your query. Since GraphQL execution engines throw an error when encountering an unknown field, this introduces a scenario where the code passes type checks but errors at runtime.

## Related works

Several other solutions employ an approach similar to this library. This project is particularly indebted to [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) for their idea of using TypeScript type transformations to precisely type GraphQL response data. If you are interested in this project, you may want to take a look at them as well.
