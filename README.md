# gql-in-ts

[![npm](https://img.shields.io/npm/v/gql-in-ts)](https://www.npmjs.com/package/gql-in-ts/) ![](https://github.com/ykiu/gql-in-ts/actions/workflows/ci.yaml/badge.svg)

A type-safe way to write GraphQL. Express queries as plain JavaScript objects and get types inferred by TypeScript.

<img src="https://user-images.githubusercontent.com/32252655/188314291-69ecbd37-2f11-4445-b493-e57186b3eb90.gif" style="aspect-ratio: 1460 / 474" alt="A screen recording demonstrating how to write a query as a plain JavaScript object." />

## Features

### Seamless development experience

**Update queries without running code generation**. Changes in queries automatically cascade to the relevant types.

### Minimum setup

**Use GraphQL without maintaining a complex development setup**. With `gql-in-ts`, queries are 100% pure TypeScript. If your editor understands TypeScript, you'll get real-time type checking and auto-completion for `gql-in-ts` queries without any plugins.

### Framework agnostic

**Work with your favorite stack**. At its core, `gql-in-ts` is a `JSON.stringify()` for GraphQL. Whether you're using React, Vue, vanilla, or even a non-browser runtime -- `gql-in-ts` will fit right in.

## Background

In a TypeScript project, it is typical to employ code generation to obtain type information from GraphQL queries. This approach, while it does a great job at ensuring type safety, comes with some pain points including:

- You'll have to run code generation every time you change queries.
- You'll often get poor support from the text editor while editing GraphQL. You have to install plugins that understand GraphQL to enable features like syntax highlighting or auto-completion.

`gql-in-ts` attempts to solve these problems in a distinct approach: expressing GraphQL queries as plain TypeScript objects.

With `gql-in-ts`, you run code generation _only when the schema changes_. Since schemas tend to change less often than queries, you'll need to run code generation less frequently than in the case of the mainstream approach.

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

The `graphql` function returns the last argument as is. It is essentially an identity function that looks like this:

```ts
const graphql = () => (arg) => arg;
```

The true value of `graphql` lies in its type definition. By wrapping your query with `graphql`, you'll get suppport from TypeScript like completion and type checking.

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

Use the `Result` type for typing the data that's returned from the server for the query you wrote:

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

**`Result` is the heart and soul of `gql-in-ts`.**
It maps the query to the type of the response for that query. `Result` achieves this by relying on the TypeScript ability to do complex transformations such as [mapping object properties](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) and [making conditions](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) as part of type checking.

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

`gql-in-ts` is agnostic of the transport layer: it's your responsibility to send requests to your backend server. That said, most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), so let me include an example demonstrating how to send a typed GraphQL query using `fetch`:

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

Say you want to render a post. You've split the rendering function into two parts where the first one is for the header of a post and the second one for the main text. The former is only interested in the post's `title` and `author`:

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
