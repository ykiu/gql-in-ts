/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, test } from './testing/vitest';
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
        'content-type': 'application/json',
        // If your endpoint requires authorization, comment out the code below.
        // authorization: '...'
      },
    });
    const responseData = (await response.json()).data;
    return responseData;
  };

  const postFragment__v2 = graphql('Post')({
    id: true,
    'content as longContent': [{ maxLength: 4000 }, true],
    'content as shortContent': [{ maxLength: 40 }, true],
  });

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

  const processFeedItem = (feedItem: Result<typeof feedFragment>) => {
    if (feedItem.__typename === 'Comment') {
      // The type of feedItem is Comment in this block.
    } else if (feedItem.__typename === 'Post') {
      // The type of feedItem is Post in this block.
    }
  };

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
  const query__v3 = graphql('Query')({
    posts: {
      '...': postDetailFragment,
      author: { nickname: true },
    },
  });
  const query__v4 = graphql('Query')({
    posts: {
      '... as a': postDetailFragment,
      '... as b': postSummaryFragment,
    },
  });
  const compiled__v3 = compileGraphQL('query')(query__v4);
  expect(compiled__v3).toEqual(
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
  const userFragment__v2 = graphql('User', { avatarSize: 'Int!' })(($) => ({
    avatar: [{ width: $.avatarSize, height: $.avatarSize }, true],
  }));
  const postFragment__v3 = graphql('Post', { avatarSize: 'Int!' })(($) => ({
    id: true,
    author: {
      id: true,
      '...': userFragment__v2({ avatarSize: $.avatarSize }),
    },
  }));
  const compiled__v4 = compileGraphQL('query', { avatarSize: 'Int!' })(($) => ({
    posts: postFragment__v3({ avatarSize: $.avatarSize }),
  }));
  expect(compiled__v4).toEqual(
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
});
