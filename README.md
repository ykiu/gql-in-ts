# gql-in-ts

A type-safe way to write GraphQL. Express your query as a plain JavaScript object and get it typed with the power of TypeScript.

```ts
compileQuery(null)({
  user: {
    username: true,
    nickname: true,
  },
  posts: [{ author: 'me' }, { title: true, content: true }],
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

Now you are ready to get underway.

## Basic usage

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

The true value of `graphql` lies in its type definition. It constrains its arguments so that it only accepts a valid GraphQL query. If you forgot to provide a required argument for a field, for example, you'll get a TypeScript error. It also serves as a trigger for auto-completion. If you are using a TypeScript-aware editor, you'll get completion for field names as you type.

Now, how would you know the shape of the response that would be returned for the query you wrote? Use the `Result` type for that:

```ts
import { Result } from 'gql-in-ts';

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

Finally, it's time to build an actual GraphQL query! Compile the query into string by using `compileQuery`:

```ts
import { compileQuery } from './yourSchema';

const compiled = compileQuery(null)(query);
console.log(compiled);
// query {
//   user {
//     username
//     nickname
//   }
//   posts(author: "me") {
//     title
//     content
//   }
// }
```

Think of `compileQuery` as a JSON.stringify() for GraphQL. It transforms a plain JavaScript object that looks like to a GraphQL into an actual GraphQL string.

While at runtime `compileQuery` returns an ordinary string, at the TypeScript level its return type is a special string subtype named `GraphQLString`. `GraphQLString`, in addition to all the string properties, has one useful property embedded: the `Result` for the compiled query. You can extract the `Result` by using [the infer keyword in a conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types):

```ts
type MyResult = typeof compiled extends GraphQLString<infer T, never> ? TResult : never;
```

That's all for the basics. Note that `gql-in-ts` is agnostic of the transport layer: it's your responsibility to actually send a request to your backend server. That said, most GraphQL endpoints are [served over HTTP](https://graphql.org/learn/serving-over-http/), so let me include an example demonstrating how to send a typed GraphQL query using `fetch`:

```ts
const makeGraphqlRequest = async <TResult>(
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

Putting it altogether, the code looks like:

```

```

## Aliases

`gql-in-ts` supports aliases via special keys with the pattern "[original name] as [alias]":

```ts

```

This is made possible thanks to [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) introduced in TypeScript 4.1.

## Fragments

Fragments allow to split a large, complex query into smaller, managable pieces. `gql-in-ts` supports and encourages the use of fragments. The query from the previous example can be split up like:

```ts

```

You can place the fragment that describes the shape of data right next to the code that needs that data, a pattern known as "collocation".

Sometimes you may want to "merge" the contents of a fragment into a larger query or fragment. You can do so by using the special key spelled "...":

```ts

```

You can "merge" more than one fragment by adding an alias to "..." like:

```ts

```

## Variables

`gql-in-ts` supports GraphQL variables. Variables allow you to compile a query once and use the compiled query over and over again with different parameters, minimizing the overhead of compiling.

To use variables, declare the names and the types of the variables and pass a callback to `graphql`:

```ts

```

As with aliases, variable definitions are type checked thanks to template literal types.

As in the first example, `graphql` returns the last argument, which is a callback in this case, unmodified. You can call the returned callback in other queries to compose a bigger query:

```ts

```

## Limitations

At the moment this `gql-in-ts` has the following limitations:

- Not capable of checking for extraneous fields.
- No support for unions and interfaces.

## Related works

There are several other solutions that employs a similar approach. [GraphQL Zeus](https://github.com/graphql-editor/graphql-zeus) and [genql](https://github.com/remorses/genql) are especially similar to this library in how they use TypeScript to precisely type GraphQL response data. If you are interested in this project you should definitely check them as well.
