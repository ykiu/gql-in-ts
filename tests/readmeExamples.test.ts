/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, test } from './vitest';
import { Input, Output, graphql } from './schema';

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

  const postFragment__v2 = graphql('Post')({
    id: true,
    'content as longContent': [{ maxLength: 4000 }, true],
    'content as shortContent': [{ maxLength: 40 }, true],
  });

  const doSomethingWithPost = (post: Output<typeof postFragment__v2>) => {
    /* ... */
  };

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

  const doSomethingWithFeedItem = (feedItem: Output<typeof feedFragment>) => {
    if (feedItem.__typename === 'Comment') {
      // feedItem is a Comment in this block.
    } else if (feedItem.__typename === 'Post') {
      // feedItem is a Post in this block.
    }
  };

  const postHeaderFragment = graphql('Post')({
    title: true,
    author: {
      id: true,
      username: true,
      avatar: [{ width: 128, height: 128 }, true],
    },
  });

  const postContentFragment = graphql('Post')({
    content: true,
  });

  const postFragment__v3 = graphql('Post')({
    id: true,
    '... as a': postHeaderFragment,
    '... as b': postContentFragment,
  });

  const doSomethingWithPost__v2 = (post: Output<typeof postFragment__v3>) => {
    /* .. */
  };

  const userFragment__v2 = graphql('User', { avatarSize: 'Int!' })(($) => ({
    avatar: [{ width: $.avatarSize, height: $.avatarSize }, true],
  }));
  const postFragment__v4 = graphql('Post', { avatarSize: 'Int!' })(($) => ({
    id: true,
    author: {
      id: true,
      '...': userFragment__v2({ avatarSize: $.avatarSize }),
    },
  }));
  const query__v3 = graphql('Query', { avatarSize: 'Int!' })(($) => ({
    posts: postFragment__v4({ avatarSize: $.avatarSize }),
  }));
  expect(JSON.parse(JSON.stringify(query__v3))).toEqual(
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
  fetchGraphQL__v2(query__v3, { avatarSize: 128 }).then((data) => {
    const avatars = data.posts.map((post) => post.author.avatar);
    // ...
  });
});
