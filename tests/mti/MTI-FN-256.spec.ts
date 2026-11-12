import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 태그팔로우, 태그팔로우취소 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-256',
  name: 'POST /api/v1/tags/{name}/unfollow 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자가 시험 태그를 팔로우하고 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
    태그이름: z.string().describe('시험 태그 이름 — 해시태그로 쓸 수 있는 한글 · 영문 · 숫자').default('mti시험태그'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  try {
    const 준비 = await 태그팔로우(request, 토큰, params.태그이름);
    await test.step('준비한 태그 상태를 확인한다', async () => {
      await verify('두 번째 사용자가 시험 태그를 팔로우하고 있다', 준비 === 200, true, { blocker: true });
    });
    await test.step('POST /api/v1/tags/{name}/unfollow 를 두 번째 사용자 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/tags/${encodeURIComponent(params.태그이름)}/unfollow`, { headers: 머리(토큰) });
      await verify('POST /api/v1/tags/{name}/unfollow 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 태그팔로우취소(request, 토큰, params.태그이름);
  }
});
