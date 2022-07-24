# gql-in-ts

A type-safe way to write GraphQL. Express your query as a plain JavaScript object and get it typed with the power of TypeScript.

```ts
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

```graphql
# Equivalent GraphQL query:

query {
  user {
    username
    nickname
  }
  posts(author: "me") {
    title
    content
  }
}
```

## Motivation

Probably the most widespread way to use GraphQL in TypeScript is to write GraphQL as a string literal and use code generation to obtain the type of the response for it. While this allows for a variety of compile-time validations and optimizations, it comes with several pain points, namely:

- You have to run code generation every time you change your query.
- You get poor support from the text editor while editing string literals. To enjoy features like syntax highlighting, auto-completion and anything you'd expect from a modern editor, you'll have to install and set up a plugin dedicated for GraphQL, which adds to the complexity of your development environment.

`gql-in-ts` solves these problems in a completely different approach: express queries as plain JavaScript objects.

With `gql-in-ts`, you run code generation _ideally only once_ to transform a GraphQL schema into a TypeScript-friendly format. Since schemas tend to change less often than queries, you would have to run the code generation less frequently than in the case of the conventional approach.

`gql-in-ts` ships with a carefully designed type definition, allowing TypeScript to provide auto-completion and to infer the type of the data that would be returned for the query.

This approach requires no changes to your development setup. If you're using TypeScript, you are ready to go.

## Features

- Light weight
  - The core `gql-in-ts` library and the generated code is \_\_\_ kb gzipped after TypeScript transpilation. The size of the generated code remains constant regardless of the size of the schema.
- Framework agnostic
  - it is even agnostic of browser APIs like fetch(). You can use it in literally any JavaScript runtime.

## Getting started

Install the library:

```bash
npm i https://github.com/ykiu/gql-in-ts/releases/download/nightly/gql-in-ts-0.1.0.tgz
```

Generate TypeScript code from your schema:

```bash
npx compileGraphqlSchema yourSchema.graphql yourSchema.ts
```

Now you are ready to get started.

## Core concepts

### The `graphql` function

The generated module exports a function named `graphql`, which helps to write typed GraphQL queries.

```ts
import { graphql } from './yourSchema';

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

The true value of `graphql` lies in its type definition. It constrains its arguments so that it only accepts a valid GraphQL query. If you forgot to provide a required argument for a field, for example, you'll get a TypeScript error. It also serves as a trigger for auto-completion. If you are using an editor that supports TypeScript, you'll get completion for field names.

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

Now, how would you know the shape of the response that would be returned for the query you wrote? Use the `Result` type for that:

```ts
import { Result } from './yourSchema';

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

**`Result` is the heart and soul of `gql-in-ts`.** It does all the heavy lifting of mapping the shape of the query to the shape of the actual data that would be returned from the GraphQL server. `Result` does this by relying on the TypeScript ability to do complex computations such as [mapping object properties](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) and [making conditions](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) as part of type checking.

### The `compileGraphQL` function

Finally, it's time to build an actual GraphQL query! Compile the query into string by using `compileGraphQL`:

```ts
import { compileGraphQL } from './yourSchema';

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

Because `graphql` is just a helper for type checking, you can skip calling it and define your query inline in `compileGraphQL`:

```ts
import { compileGraphQL } from './yourSchema';

const compiled = compileGraphQL('query')({
  user: userFragment,
  posts: [{ author: 'me' }, postFragment],
});
```

### Making a request

`gql-in-ts` is agnostic of the transport layer: it's your responsibility to actually send a request to your backend server. That said, most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), so let me include an example demonstrating how to send a typed GraphQL query using `fetch`:

```ts
const makeGraphQLRequest = async <TResult>(
  compiled: GraphQLString<TResult, never>,
): Promise<TResult> => {
  const response = await fetch('http://example.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query: compiled }),
    headers: {
      // If your endpoint requires authorization, comment out the code below.
      // Authorization: '...'
    },
  });
  const responseData = (await response.json()).data;
  return responseData;
};
```

## Using aliases

`gql-in-ts` supports aliases via special keys with the pattern "[original name] as [alias]":

```ts

```

This is made possible thanks to [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) introduced in TypeScript 4.1.

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

`gql-in-ts` supports GraphQL variables. Variables allow you to compile a query once and use the same query over and over again with different parameters, minimizing the overhead of compiling.

To define a fragment with variables, declare the names and the types of the variables and pass a callback to `graphql`. You can reference the variables from within the callback:

```ts
const userFragment = graphql('User', { avatarSize: 'Int!' })(($) => ({
  avatar: [{ width: $.avatarSize, height: $.avatarSize }, true],
}));
```

As in the first example, `graphql` returns the last argument unmodified. In this case, the last argument is a function. Call that function in other places to build a bigger query or fragment:

```ts
const postFragment = graphql('Post', { avatarSize: 'Int!' })(($) => ({
  id: true,
  author: {
    id: true,
    '...': userFragment({ avatarSize: $.avatarSize }),
  },
}));
```

To compile a query with variables, pass the definitions of the variables and a callback to `compileGraphQL` in the same way described for `graphql`:

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

There are several other solutions that employs a similar approach. [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) are especially similar to this library in how they use TypeScript to precisely type GraphQL response data. If you are interested in this project you should definitely check them as well.
