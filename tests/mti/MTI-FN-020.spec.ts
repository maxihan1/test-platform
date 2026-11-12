import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 보임설정되돌리기, 프로필읽기 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-020',
  name: 'PATCH /api/v1/profile 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 원래 = await 프로필읽기(request, 토큰);
  try {
    await test.step('두 번째 사용자 토큰을 확인한다', async () => {
      await verify('두 번째 사용자 토큰이 있다', 원래.id !== '', true, { blocker: true });
    });
    await test.step('PATCH /api/v1/profile 를 두 번째 사용자 토큰으로 부른다', async () => {
      const 응답 = await request.patch('/api/v1/profile', {
        headers: 머리(토큰),
        data: { show_media: false, show_media_replies: false, show_featured: false },
      });
      await verify('PATCH /api/v1/profile 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 보임설정되돌리기(request, 토큰, 원래);
  }
});
