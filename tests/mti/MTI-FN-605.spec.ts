import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';
import { 글쓰기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-605',
  name: 'private 글을 인용해 public 글을 쓰면 visibility 가 private 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자가 볼 수 있는 private 글이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    공개범위: z.string().describe('인용 글의 공개 범위').default('private'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰2 = params.user2Password ?? '';
  const 비공개글 = await 글쓰기(request, 토큰2, { visibility: 'private' });
  const 만든: string[] = [비공개글];
  try {
    await test.step('두 번째 사용자의 private 글을 확인한다', async () => {
      await verify('두 번째 사용자가 볼 수 있는 private 글이 있다', 비공개글 !== '', true, { blocker: true });
    });
    await test.step('두 번째 사용자가 quoted_status_id 로 private 글을 인용해 public 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰2, { visibility: 'public', quoted_status_id: 비공개글 });
      만든.unshift(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { visibility?: string };
      await verify('private 글을 인용해 public 글을 쓰면 visibility 가 private 이다', 몸.visibility, expected.공개범위);
    });
  } finally {
    await 글들지우기(request, 토큰2, 만든);
  }
});
