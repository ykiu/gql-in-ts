/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, test } from './vitest';
import { graphql } from './schema';

import { Output, Input } from '../src';

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

  const compiled__v1 = JSON.stringify({ query: query__v2 });
  expect(compiled__v1).toEqual(
    '{"query":"query {\\n  user {\\n    username\\n    nickname\\n  }\\n  posts(author: \\"me\\") {\\n    title\\n    content\\n  }\\n}"}',
  );

  type QueryResult = Output<typeof query__v2>;
  // QueryResult is inferred as:
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

  const fetchGraphQL = async <T>(query: T) => {
    const response = await fetch('http://example.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: {
        'content-type': 'application/json',
        // If your endpoint requires authorization, comment out the code below.
        // authorization: '...'
      },
    });
    const responseData = (await response.json()).data;
    return responseData as Output<T>;
  };

  // Can be used like:
  fetchGraphQL(query__v2).then((data) => {
    const titles = data.posts.map((post) => post.title);
    // ...
  });

  // Field selections
  const query__v7 = graphql('Query')({
    user: {
      username: true,
      nickname: true,
    },
  });

  // Field selections with inputs
  const query__v8 = graphql('Query')({
    user: {
      username: true,
      nickname: true,
      avatar: [{ size: 128 }, true],
    },
    posts: [
      { author: 'me' },
      {
        title: true,
        content: true,
      },
    ],
  });

  // Field selections with aliases

  const query__v9 = graphql('Query')({
    user: {
      username: true,
      nickname: true,
      'avatar as avatarSmall': [{ size: 128 }, true],
      'avatar as avatarLarge': [{ size: 512 }, true],
    },
  });

  type QueryOutput = Output<typeof query__v9>;

  // Fragments

  const postHeaderFragment = graphql('Post')({
    title: true,
    author: {
      id: true,
      username: true,
      avatar: [{ width: 128, height: 128 }, true],
    },
  });

  const postFragment__v1 = graphql('Post')({
    id: true,
    '...': postHeaderFragment,
  });

  type PostFragmentOutput__v1 = Output<typeof postFragment__v1>;

  const postContentFragment = graphql('Post')({
    content: true,
  });

  const postFragment__v2 = graphql('Post')({
    id: true,
    '... as a': postHeaderFragment,
    '... as b': postContentFragment,
  });

  type PostFragmentOutput__v2 = Output<typeof postFragment__v2>;

  // Unions and interfaces

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

  type FeedFragmentOutput = Output<typeof feedFragment>;

  // eslint-disable-next-line prefer-const
  let feedItem: FeedFragmentOutput = {} as any;

  if (feedItem.__typename === 'Comment') {
    // TypeScript figures out feedItem is a Comment in this block, and ...
  } else if (feedItem.__typename === 'Post') {
    // feedItem is a Post in this block.
  }

  // Variables in queries

  const query__v4 = graphql('Query', { postsAuthor: 'String!' })(($) => ({
    posts: [
      { author: $.postsAuthor },
      {
        title: true,
        content: true,
      },
    ],
  }));

  type QueryInput = Input<typeof query__v4>;

  const fetchGraphQL__v2 = async <T>(query: T, variables: Input<T>) => {
    const response = await fetch('http://example.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
      headers: {
        'content-type': 'application/json',
        // If your endpoint requires authorization, comment out the code below.
        // authorization: '...'
      },
    });
    const responseData = (await response.json()).data;
    return responseData as Output<T>;
  };

  // Can be used like:
  fetchGraphQL__v2(query__v4, { postsAuthor: 'alice' }).then((data) => {
    // ...
  });

  // Variables in fragments

  const userFragment__v3 = graphql('User', { avatarSize: 'Int!' })(($) => ({
    avatar: [{ size: $.avatarSize }, true],
  }));

  const query__v5 = graphql('Query', { postsAuthor: 'String!' })(($) => ({
    posts: [
      { author: $.postsAuthor },
      {
        title: true,
        content: true,
        author: userFragment__v3({ avatarSize: 128 }),
      },
    ],
  }));

  const query__v6 = graphql('Query', { postsAuthor: 'String!', postsAuthorAvatarSize: 'Int!' })(
    ($) => ({
      posts: [
        { author: $.postsAuthor },
        {
          title: true,
          content: true,
          author: userFragment__v3({ avatarSize: $.postsAuthorAvatarSize }),
        },
      ],
    }),
  );
});
