/* eslint-disable @typescript-eslint/no-namespace */
import { describe, expect, it } from 'vitest';
import {
  GraphQLString,
  LiteralOrVariable,
  RecursivelyMergeSpreads,
  Result,
  Selection,
} from './graphql';
import { Mutation, Query, graphql, compileGraphQL } from './testing/schema';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expectType<TActual extends TExpected, TExpected>() {
  // no runtime code
}

/** Readability helpers to be used with expectType() */
namespace To {
  export type BeAssignableTo<T> = T;
  export type TakeGraphQLVariableValues<TVariableValues> = {
    __takeVariableValues?: (values: TVariableValues) => void;
  };
  export type TakeArguments<TArgs extends unknown[]> = (...args: TArgs) => void;
}

type Tuple<A, B> = { 0: A; 1: B };

describe('Selection', () => {
  it('constrains a selection to match the schema', () => {
    expectType<
      Selection<Query>['user'],
      // prettier-ignore
      To.BeAssignableTo<
        | { username?: true | Tuple<{}, true> }
        | Tuple<{}, { username?: true | Tuple<{}, true> }>
        | undefined
      >
    >();
  });
  it('constrains arguments to match the schema', () => {
    expectType<
      Exclude<Selection<Mutation>['bulkMutatePosts'], undefined>['0'],
      To.BeAssignableTo<{
        inputs: LiteralOrVariable<
          {
            id?: LiteralOrVariable<number | null>;
            title: LiteralOrVariable<string>;
            content: LiteralOrVariable<string>;
          }[]
        >;
      }>
    >();
  });
});

describe('Result', () => {
  it('infers the response type of a query', () => {
    const typedQuery = graphql('Query')({
      user: {
        username: true,
        nickname: true,
      },
      'posts as myPosts': [
        { author: 'me' },
        { title: true, content: [{ maxLength: 300 }, true], status: true },
      ],
    });
    expectType<
      Result<typeof typedQuery>,
      To.BeAssignableTo<{
        user: { username: string; nickname: string | null };
        myPosts: { title: string; content: string; status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED' }[];
      }>
    >();
  });
  it('merges fragment spreads', () => {
    const typedQuery = graphql('Query')({
      user: {
        username: true,
      },
      '... as ...1': {
        user: { nickname: true },
        posts: [
          { author: 'me' },
          {
            '...': {
              title: true,
            },
          },
        ],
      },
      '... as ...2': {
        posts: [
          { author: 'me' },
          {
            '...': {
              content: true,
            },
          },
        ],
      },
    });
    expectType<
      RecursivelyMergeSpreads<typeof typedQuery>,
      To.BeAssignableTo<{
        user: Tuple<
          unknown,
          {
            username: Tuple<unknown, true>;
            nickname: Tuple<unknown, true>;
          }
        >;
        posts: Tuple<
          unknown,
          {
            title: Tuple<unknown, true>;
            content: Tuple<unknown, true>;
          }
        >;
      }>
    >();

    expectType<
      Result<typeof typedQuery>,
      To.BeAssignableTo<{
        user: { username: string; nickname: string | null };
        posts: {
          title: string;
          content: string;
        }[];
      }>
    >();

    expectType<
      Result<{
        __type: Query;
        posts: {
          title: true;
          content: true;
        };
        '... as ...1': Selection<Query>;
      }>,
      To.BeAssignableTo<{
        posts: {
          title: string;
          content: string;
        }[];
      }>
    >();
  });
});

describe('compileSelection', () => {
  const processCompiled = <TResult, TVariableValues>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: {
      compiled: GraphQLString<TResult, TVariableValues>;
      variables: TVariableValues;
    },
  ): TResult => ({} as TResult);

  it('can compile a basic query', () => {
    expect(
      compileGraphQL('query')({
        user: {
          username: true,
          nickname: true,
        },
        'posts as myPosts': [
          { author: 'me' },
          { title: true, content: [{ maxLength: 300 }, true] },
        ],
      }),
    ).toEqual(
      `
query {
  user {
    username
    nickname
  }
  myPosts: posts(author: "me") {
    title
    content(maxLength: 300)
  }
}
    `.trim(),
    );
  });
  it('recursively merges fragment spreads', () => {
    expect(
      compileGraphQL('query')({
        '...': {
          '...': {
            posts: {
              'content as shortContent': [{ maxLength: 100 }, true],
              '... as ...1': { title: true },
            },
          },
        },
        posts: {
          content: true,
        },
      }),
    ).toEqual(
      `
query {
  posts {
    shortContent: content(maxLength: 100)
    content
    title
  }
}
    `.trim(),
    );
  });

  it('can compile a variable of type list', () => {
    const compiled = compileGraphQL('mutation', { inputs: '[MutatePostInput!]!' })(($) => ({
      bulkCreatePosts: [{ inputs: $.inputs }, { id: true }],
    }));
    expect(compiled).toEqual(
      `
mutation($inputs: [MutatePostInput!]!) {
  bulkCreatePosts(inputs: $inputs) {
    id
  }
}
      `.trim(),
    );
    expectType<
      typeof compiled,
      To.TakeGraphQLVariableValues<{ inputs: [{ title: 'Lorem'; content: 'Ipsum' }] }>
    >();

    expectType<
      typeof compiled,
      To.TakeGraphQLVariableValues<{ inputs: [{ id: 1; title: 'Lorem'; content: 'Ipsum' }] }>
    >();

    expectType<
      // @ts-expect-error: Missing a required field "content"
      typeof compiled,
      To.TakeGraphQLVariableValues<{ inputs: [{ title: 'Lorem' }] }>
    >();

    expectType<
      // @ts-expect-error: Missing a variable "inputs".
      typeof compiled,
      To.TakeGraphQLVariableValues<{}>
    >();

    expectType<
      // @ts-expect-error: Type of content should be string, but 1 is given.
      typeof compiled,
      To.TakeGraphQLVariableValues<{ inputs: [{ title: 'Lorem'; content: 1 }] }>
    >();

    // Ensure types for the variable values and the result are inferred correctly.
    const result = processCompiled({
      compiled,
      variables: {
        inputs: [{ title: 'a', content: 'b' }],
      },
    });
    expectType<typeof result, To.BeAssignableTo<{ bulkCreatePosts: { title: string }[] }>>();
  });
  it('can compile a variable of input', () => {
    const compiled = compileGraphQL('mutation', { input: 'LoginInput!' })(($) => ({
      login: [{ input: $.input }, { token: true, user: { username: true } }],
    }));
    expect(compiled).toEqual(
      `
mutation($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      username
    }
  }
}
      `.trim(),
    );

    // Ensure types for the variable values and the result are inferred correctly.
    const result = processCompiled({
      compiled,
      variables: {
        input: { username: 'alice', password: 'zxcvbn' },
      },
    });
    expectType<
      typeof result,
      To.BeAssignableTo<{ login: { token: string; user: { username: string } } }>
    >();
  });
});
