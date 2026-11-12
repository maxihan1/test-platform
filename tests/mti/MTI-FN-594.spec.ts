import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 잠긴계정비공개글 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-594',
  name: '팔로워 토큰으로 private 글을 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    공개범위: z.string().describe('응답한 글의 공개 범위').default('private'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰2 = params.user2Password ?? '';
  const 번호 = await 잠긴계정비공개글(request, 토큰2);
  await test.step('두 번째 사용자가 볼 수 있는 yuna_locked 의 private 글을 확인한다', async () => {
    await verify('두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다', 번호 !== '', true, { blocker: true });
  });
  await test.step('두 번째 사용자 토큰으로 yuna_locked 의 private 글을 GET /api/v1/statuses/{id} 로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${번호}`, { headers: 머리(토큰2) });
    await verify('팔로워 토큰으로 private 글을 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { visibility?: string };
    await verify('응답한 글의 visibility 가 private 이다', 몸.visibility, expected.공개범위);
  });
});
