import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost, recreatePost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/post-recreate', async (c) => {
  try {
    const { postId } = await c.req.json<{ postId: string }>();

    if (!postId) {
      return c.json<UiResponse>(
        {
          showToast: 'Post ID is required to recreate the post.',
        },
        400
      );
    }

    const post = await recreatePost(postId);

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error recreating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to recreate post',
      },
      400
    );
  }
});
