import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';
import { createPost, recreatePost } from '../core/post';

export const menu = new Hono();


const assertModerator = async (): Promise<void> => {
  const username = await reddit.getCurrentUsername();
  const subredditName = context.subredditName;
  if (!username || !subredditName) throw new Error('Moderator access required.');

  const mods = await reddit.getModerators({ subredditName, username, limit: 1 }).all();
  if (!mods.some((mod) => mod.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Moderator access required.');
  }
};

menu.post('/post-create', async (c) => {
  try {
    await assertModerator();
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
    await assertModerator();
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
