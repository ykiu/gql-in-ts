/* eslint-disable @typescript-eslint/no-namespace */
import { describe, expect, it } from 'vitest';
import {
  GraphQLString,
  LiteralOrVariable,
  RecursivelyMergeSpreads,
  Result,
  Selection,
} from './graphql';
import { Mutation, Query, compileMutation, compileQuery, graphql } from './testing/schema';

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
      Exclude<Selection<Mutation>['post'], undefined>['0'],
      To.BeAssignableTo<{
        input: LiteralOrVariable<{
          id?: LiteralOrVariable<number | null>;
          title: LiteralOrVariable<string>;
          content: LiteralOrVariable<string>;
        }>;
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
      'posts as myPosts': [{ author: 'me' }, { title: true, content: [{ length: 300 }, true] }],
    });
    expectType<
      Result<typeof typedQuery>,
      To.BeAssignableTo<{
        user: { username: string; nickname: string | null };
        myPosts: { title: string; content: string }[];
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
  it('can compile a basic query', () => {
    expect(
      compileQuery(null)({
        user: {
          username: true,
          nickname: true,
        },
        'posts as myPosts': [{ author: 'me' }, { title: true, content: [{ length: 300 }, true] }],
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
    content(length: 300)
  }
}
    `.trim(),
    );
  });
  it('recursively merges fragment spreads', () => {
    expect(
      compileQuery(null)({
        '...': {
          '...': {
            posts: {
              'content as shortContent': [{ length: 100 }, true],
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
    shortContent: content(length: 100)
    content
    title
  }
}
    `.trim(),
    );
  });

  it('can compile variables', () => {
    const query = () => graphql('Mutation')({});
    const compiled = compileMutation({ foo: '[PostMutationInput]', bar: 'Int!' })(query);
    expect(compiled).toEqual(
      `
mutation($foo: [PostMutationInput], $bar: Int!) {

}
      `.trim(),
    );
    expectType<
      typeof compiled,
      To.TakeGraphQLVariableValues<{ foo: [{ title: 'Lorem'; content: 'Ipsum' }]; bar: 1 }>
    >();

    expectType<
      typeof compiled,
      To.TakeGraphQLVariableValues<{ foo: [{ title: 'Lorem'; content: 'Ipsum' }]; bar: 1 }>
    >();

    expectType<typeof compiled, To.TakeGraphQLVariableValues<{ bar: 1 }>>();

    expectType<
      // @ts-expect-error: Ensure variable types are type-checked.
      typeof compiled,
      To.TakeGraphQLVariableValues<{ foo: [{ title: 'Lorem' }]; bar: 1 }>
    >();

    expectType<
      // @ts-expect-error: Ensure variable types are type-checked.
      typeof compiled,
      To.TakeGraphQLVariableValues<{ foo: [{ title: 'Lorem'; content: 'Ipsum' }] }>
    >();

    expectType<
      // @ts-expect-error: Ensure variable types are type-checked.
      typeof compiled,
      To.TakeGraphQLVariableValues<{ foo: [{ title: 'Lorem'; content: 'Ipsum' }]; bar: '1' }>
    >();
  });
  it('can compile a mutation with variables', () => {
    const compiled = compileMutation({ input: 'PostMutationInput!' })(($) => ({
      post: [{ input: $.input }, { title: true }],
    }));
    expect(compiled).toEqual(
      `
mutation($input: PostMutationInput!) {
  post(input: $input) {
    title
  }
}
      `.trim(),
    );
    const processCompiled = <TResult, TVariableValues>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _: {
        compiled: GraphQLString<TResult, TVariableValues>;
        variables: TVariableValues;
      },
    ): TResult => ({} as TResult);

    // Ensure types for the variable values and the result are inferred correctly.
    const result = processCompiled({
      compiled,
      variables: {
        input: { title: 'a', content: 'b' },
      },
    });
    expectType<typeof result, To.BeAssignableTo<{ post: { title: string } }>>();
  });
});
