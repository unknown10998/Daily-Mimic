import { context, reddit } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: 'Mimic',
    textFallback: {
      text: 'Play Mimic and answer today’s prompt.',
    },
  });
};

export const removePost = async (postId: string) => {
  const thingId: T3 = postId.startsWith('t3_') ? `t3_${postId.slice(3)}` : `t3_${postId}`;
  await reddit.remove(thingId, false);
};

export const recreatePost = async (postId: string) => {
  await removePost(postId);
  return await createPost();
};
