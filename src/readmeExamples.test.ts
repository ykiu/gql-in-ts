/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, test } from 'vitest';
import { compileGraphQL, graphql, Result, GraphQLString } from './testing/schema';

declare const fetch: any;

test('', () => {
  const query__v1 = graphql('Query')({
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

  const userFragment = graphql('User')({
    username: true,
    nickname: true,
  });
  const postFragment = graphql('Post')({
    title: true,
    content: true,
  });
  const query__v2 = graphql('Query')({
    user: userFragment,
    posts: [{ author: 'me' }, postFragment],
  });

  type QueryResult = Result<typeof query__v1>;
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

  const compiled__v1 = compileGraphQL('query')(query__v1);
  expect(compiled__v1).toEqual(
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
  type MyResult = typeof compiled__v1 extends GraphQLString<infer TResult, never> ? TResult : never;

  const compiled__v2 = compileGraphQL('query')({
    user: userFragment,
    posts: [{ author: 'me' }, postFragment],
  });

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
});
