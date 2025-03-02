/* eslint-disable @typescript-eslint/no-namespace */
import { describe, expect, it, test } from './vitest';
import {
  LiteralOrVariable,
  NormalizeSelection,
  Resolve,
  Output,
  Selection,
  HasResolved,
  Input,
} from '../src/graphql';
import { Mutation, Query, graphql } from './schema';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expectType<TActual extends TExpected, TExpected>() {
  // no runtime code
}

/** Readability helpers to be used with expectType() */
namespace To {
  export type BeAssignableTo<T> = T;
  export type TakeGraphQLVariableValues<TVariableValues> = HasResolved<TVariableValues, unknown>;
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

describe('Output', () => {
  it('processes a simple selection', () => {
    const query = graphql('Query')({
      user: {
        username: true,
        nickname: true,
      },
      'posts as myPosts': [
        { author: 'me' },
        { title: true, content: [{ maxLength: 300 }, true], status: true },
      ],
    });
    type Result1 = Output<typeof query>;
    expectType<
      Result1,
      To.BeAssignableTo<{
        user: { username: string; nickname: string | null };
        myPosts: { title: string; content: string; status: 'DRAFT' | 'PUBLIC' | 'ARCHIVED' }[];
      }>
    >();
  });
  it('processes a callback selection', () => {
    const query = graphql('Query', { author: 'String' })(($) => ({
      posts: [
        { author: $.author },
        {
          title: true,
        },
      ],
    }));
    type Result1 = Output<typeof query>;
    expectType<
      Result1,
      To.BeAssignableTo<{
        posts: { title: string }[];
      }>
    >();
  });
  it('processes a selection with fragment spreads', () => {
    const query = graphql('Query')({
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

      // Test if wrapping a subfragment with graphql()() is harmless.
      '... as ...2': graphql('Query')({
        posts: [
          { author: 'me' },
          {
            '...': {
              content: true,
            },
          },
        ],
      }),
    });

    type Normalized = NormalizeSelection<Omit<typeof query, '__resolved'>>;

    expectType<
      Normalized,
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

    type Result1 = Output<typeof query>;

    expectType<
      Result1,
      To.BeAssignableTo<{
        user: { username: string; nickname: string | null };
        posts: {
          title: string;
          content: string;
        }[];
      }>
    >();

    type Result2 = Resolve<
      Query,
      {
        posts: {
          title: true;
          content: true;
        };
        '... as ...1': Selection<Query>;
      }
    >;

    expectType<
      Result2,
      To.BeAssignableTo<{
        posts: {
          title: string;
          content: string;
        }[];
      }>
    >();
  });
  it('processes a selection with fragments with type conditions', () => {
    const query = graphql('Query')({
      feed: {
        __typename: true,
        '...': {
          // Expect "id" to be selected on Comment.
          id: true,
        },
        author: { username: true },
        '... on Comment': {
          content: true,
          author: [
            // Note that `author` on parent is without arguments (like {...})
            // and `author` on Comment is with arguments (like [{}, {...}]).
            // Expect selection entries of different shape can be merged without
            // any problem.
            {},
            {
              nickname: true,
            },
          ],
          post: {
            title: true,
          },
        },
        '... as ...2': {
          // Current limitation: selections from the spread parent are not inherited.
          __typename: true,
          id: true,
          author: { username: true },

          // Expect Post fields to appear in the result.
          '... on Post': {
            title: true,
            content: true,
          },

          // Current limitation: cannot give an alias to fragments with type conditions
          // '... on Post as ...3': {
          //   content: true,
          // },
        },
      },
    });

    type Normalized = NormalizeSelection<Omit<typeof query, '__resolved'>>;
    expectType<
      Normalized,
      To.BeAssignableTo<{
        feed: Tuple<
          {},
          {
            id: Tuple<{}, true>;
            author: Tuple<{}, { username: Tuple<{}, true> }>;
            '... on Post': Tuple<
              {},
              {
                id: Tuple<{}, true>;
                author: Tuple<{}, { username: Tuple<{}, true> }>;
                title: Tuple<{}, true>;
                content: Tuple<{}, true>;
              }
            >;
            '... on Comment': Tuple<
              {},
              {
                id: Tuple<{}, true>;
                author: Tuple<{}, { username: Tuple<{}, true>; nickname: Tuple<{}, true> }>;
                content: Tuple<{}, true>;
                post: Tuple<{}, { title: Tuple<{}, true> }>;
              }
            >;
          }
        >;
      }>
    >();

    // Test type narrowing works as expected.
    // Note that the statements are wrapped in an immediately-GCed function so
    // that they can be tested without actually being executed.
    (result: Output<typeof query>) => {
      const feedItem = result.feed[0];
      if (feedItem.__typename === 'Post') {
        expectType<
          typeof feedItem,
          To.BeAssignableTo<{
            id: number;
            author: { username: string };
            title: string;
            content: string;
          }>
        >();
        feedItem;
      }
      if (feedItem.__typename === 'Comment') {
        expectType<
          typeof feedItem,
          To.BeAssignableTo<{
            id: number;
            author: { username: string; nickname: string | null };
            content: string;
            post: { title: string };
          }>
        >();
        feedItem;
      }
    };
  });
});

describe('Input', () => {
  test('Int', () => {
    const query = graphql('Query', { foo: 'Int!' })(() => ({ __typename: true }));
    type Result1 = Input<typeof query>;
    expectType<{ foo: number }, To.BeAssignableTo<Result1>>();
    expectType<
      // @ts-expect-error: string is not assignable to Int!.
      { foo: string },
      To.BeAssignableTo<Result1>
    >();
  });
  test('InputObjectType', () => {
    const mutation = graphql('Mutation', { input: 'LoginInput!' })(() => ({ __typename: true }));
    type Result1 = Input<typeof mutation>;
    expectType<{ input: { username: string; password: string } }, To.BeAssignableTo<Result1>>();
    expectType<
      // @ts-expect-error: password is missing.
      { input: { username: string } },
      To.BeAssignableTo<Result1>
    >();
  });
});

describe('toJSON', () => {
  const extractCompiled = (value: unknown) => JSON.parse(JSON.stringify(value));
  const processCompiled = <T>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: {
      query: T;
      variables: Input<T>;
    },
  ): Output<T> => ({} as Output<T>);

  it('compiles a simple query', () => {
    expect(
      extractCompiled(
        graphql('Query')({
          user: {
            username: true,
            nickname: true,
          },
          'posts as myPosts': [
            { author: 'me' },
            { title: true, content: [{ maxLength: 300 }, true] },
          ],
        }),
      ),
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
  it('compiles a query with nested graphql()', () => {
    expect(
      extractCompiled(
        graphql('Query')({
          user: graphql('User')({
            username: true,
            nickname: true,
          }),
        }),
      ),
    ).toEqual(
      `
query {
  user {
    username
    nickname
  }
}
    `.trim(),
    );
  });
  it('recursively merges fragment spreads', () => {
    expect(
      extractCompiled(
        graphql('Query')({
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
      ),
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
  it('compiles fragments with type conditions', () => {
    expect(
      extractCompiled(
        graphql('Query')({
          feed: {
            '... as 1': {
              id: true,
            },
            '... as 2': {
              id: true,
              '... on Comment': {
                '...': {
                  content: true,
                },
                post: { title: true },
              },
              '... on Post': {
                title: true,
              },
            },
          },
        }),
      ),
    ).toEqual(
      `
query {
  feed {
    id
    ... on Comment {
      post {
        title
      }
      content
    }
    ... on Post {
      title
    }
  }
}
    `.trim(),
    );
  });
  it('throws an Error if it got fragments with conflicting arguments', () => {
    expect(() => {
      extractCompiled(
        graphql('Query')({
          '... as a': {
            posts: { content: [{ maxLength: 100 }, true] },
          },
          '... as b': {
            posts: { content: [{ maxLength: 200 }, true] },
          },
        }),
      );
    }).toThrowError('Cannot merge fragments. Saw conflicting arguments');
  });

  it('compiles a variable of type list', () => {
    // Ensure mutationFragment is callable
    const mutationFragment = graphql('Mutation', { inputs: '[MutatePostInput!]!' })(($) => ({
      bulkMutatePosts: [{ inputs: $.inputs }, { id: true }],
    }));
    const query = graphql('Mutation', { inputs: '[MutatePostInput!]!' })(($) => ({
      '...': mutationFragment({ inputs: $.inputs }),
    }));

    expect(extractCompiled(query)).toEqual(
      `
mutation($inputs: [MutatePostInput!]!) {
  bulkMutatePosts(inputs: $inputs) {
    id
  }
}
      `.trim(),
    );

    // Ensure types for the variable values and the result are inferred correctly.
    const result = processCompiled({
      query,
      variables: {
        inputs: [{ title: 'a', content: 'b' }],
      },
    });
    expectType<typeof result, To.BeAssignableTo<{ bulkMutatePosts: { id: number }[] }>>();
  });
  it('compiles literals passed to a fragment', () => {
    const mutationFragment = graphql('Mutation', { inputs: '[MutatePostInput!]!' })(($) => ({
      bulkMutatePosts: [{ inputs: $.inputs }, { id: true }],
    }));
    // Ensure mutationFragment() can take literal values.
    const mutation = graphql('Mutation')({
      '...': mutationFragment({ inputs: [{ title: 'a', content: 'b' }] }),
    });

    expect(extractCompiled(mutation)).toEqual(
      `
mutation {
  bulkMutatePosts(inputs: [{title: "a", content: "b"}]) {
    id
  }
}
      `.trim(),
    );

    const result = processCompiled({
      query: mutation,
      variables: undefined,
    });
    expectType<typeof result, To.BeAssignableTo<{ bulkMutatePosts: { id: number }[] }>>();
  });
  it('compiles a variable of input', () => {
    const mutation = graphql('Mutation', { input: 'LoginInput!' })(($) => ({
      login: [
        { input: $.input },
        { __typename: true, '... on LoginSuccess': { token: true, user: { username: true } } },
      ],
    }));
    expect(extractCompiled(mutation)).toEqual(
      `
mutation($input: LoginInput!) {
  login(input: $input) {
    __typename
    ... on LoginSuccess {
      token
      user {
        username
      }
    }
  }
}
      `.trim(),
    );

    // Ensure types for the variable values and the result are inferred correctly.
    const result = processCompiled({
      query: mutation,
      variables: {
        input: { username: 'alice', password: 'zxcvbn' },
      },
    });

    ({ login }: typeof result) => {
      if (login.__typename === 'LoginSuccess') {
        expectType<
          typeof login,
          To.BeAssignableTo<{ token: string; user: { username: string } }>
        >();
      }
    };
  });
});
